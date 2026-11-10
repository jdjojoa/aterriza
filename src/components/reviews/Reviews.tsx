"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { createClient } from "@/lib/supabase/client";
import {
  REVIEW_MAX_LENGTH,
  formatRating,
  formatShortDate,
  wasEdited,
} from "@/lib/community";
import type { ReviewListRow, ReviewTargetType } from "@/types/database";
import { ReportDialog } from "./ReportDialog";
import { StarDisplay, StarInput } from "./Stars";

type ReviewsProps = {
  targetType: ReviewTargetType;
  targetId: string;
};

type LoadState = "loading" | "ready" | "error";

/** null = request failed. */
async function fetchReviews(targetType: ReviewTargetType, targetId: string) {
  const { data, error } = await createClient().rpc("get_reviews", {
    p_target_type: targetType,
    p_target_id: targetId,
  });
  if (error) {
    console.error("[reviews] load failed", error.message);
    return null;
  }
  return data ?? [];
}

const starsLabel = (n: number) => (n === 1 ? "1 estrella de 5" : `${n} estrellas de 5`);

/**
 * Star average, visible reviews and the user's own review form for a place,
 * route or dish. Reads through get_reviews() (shows first names) and writes
 * straight to the reviews/reports tables under RLS.
 */
export function Reviews({ targetType, targetId }: ReviewsProps) {
  const headingId = useId();
  const [state, setState] = useState<LoadState>("loading");
  const [rows, setRows] = useState<ReviewListRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState<ReviewListRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchReviews>>) => {
    if (result === null) {
      setState("error");
      return;
    }
    setRows(result);
    setState("ready");
  }, []);

  /** Re-fetch after a change (event handlers only). */
  const load = useCallback(
    async () => apply(await fetchReviews(targetType, targetId)),
    [apply, targetType, targetId],
  );

  useEffect(() => {
    let cancelled = false;
    fetchReviews(targetType, targetId).then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, targetType, targetId]);

  const own = rows.find((r) => r.is_own) ?? null;
  const visible = rows.filter((r) => r.status === "visible");
  const others = visible.filter((r) => !r.is_own);
  const average = visible.length
    ? visible.reduce((sum, r) => sum + r.rating, 0) / visible.length
    : null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 border-t border-border/30 pt-4">
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="text-lg font-extrabold text-heading">
          Reseñas
        </h3>
        {state === "ready" &&
          (average === null ? (
            <p className="text-muted">Aún no hay reseñas. ¡Sé el primero en opinar!</p>
          ) : (
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-2xl font-extrabold text-heading">{formatRating(average)}</span>
              <StarDisplay value={average} label={`Promedio: ${formatRating(average)} de 5 estrellas`} />
              <span className="text-sm text-muted">
                {visible.length === 1 ? "1 reseña" : `${visible.length} reseñas`}
              </span>
            </p>
          ))}
      </div>

      {state === "loading" && (
        <p role="status" className="text-muted">
          Cargando reseñas…
        </p>
      )}
      {state === "error" && (
        <div className="flex flex-col items-start gap-2">
          <p className="rounded-xl bg-warning-soft p-3 text-on-warning-soft">
            No pudimos cargar las reseñas. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setState("loading");
              void load();
            }}
          >
            Reintentar
          </Button>
        </div>
      )}

      {state === "ready" && (
        <>
          {own && !editing ? (
            <OwnReview
              review={own}
              onEdit={() => {
                setNotice(null);
                setEditing(true);
              }}
              onDeleted={async () => {
                setNotice("Borraste tu reseña.");
                await load();
              }}
            />
          ) : (
            <ReviewForm
              targetType={targetType}
              targetId={targetId}
              existing={own}
              onCancel={own ? () => setEditing(false) : undefined}
              onSaved={async (message) => {
                setEditing(false);
                setNotice(message);
                await load();
              }}
            />
          )}

          <p role="status" className="text-sm font-bold text-heading empty:hidden">
            {notice}
          </p>

          {others.length > 0 && (
            <ul className="flex flex-col gap-3" aria-label="Reseñas de otros usuarios">
              {others.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-border/30 bg-surface p-3">
                  <ReviewMeta review={r} />
                  {r.body && <p className="whitespace-pre-line break-words text-foreground">{r.body}</p>}
                  <div>
                    {r.reported_by_me ? (
                      <span className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted">
                        <Icon name="flag" size={16} />
                        Ya la reportaste
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        className="-ml-2 text-sm"
                        onClick={() => setReporting(r)}
                      >
                        <Icon name="flag" size={16} />
                        Reportar
                        <span className="sr-only"> la reseña de {r.author_name}</span>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ReportDialog
        target={reporting && { kind: "review", id: reporting.id, authorName: reporting.author_name }}
        onClose={() => setReporting(null)}
        onReported={(reviewId) =>
          setRows((prev) => prev.map((r) => (r.id === reviewId ? { ...r, reported_by_me: true } : r)))
        }
      />
    </section>
  );
}

function ReviewMeta({ review }: { review: ReviewListRow }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-bold text-heading">{review.is_own ? "Tú" : review.author_name}</span>
      <StarDisplay value={review.rating} size={16} label={starsLabel(review.rating)} />
      <span className="text-sm text-muted">
        <time dateTime={review.created_at}>{formatShortDate(review.created_at)}</time>
        {wasEdited(review.created_at, review.updated_at) && " · editada"}
      </span>
    </div>
  );
}

function OwnReview({
  review,
  onEdit,
  onDeleted,
}: {
  review: ReviewListRow;
  onEdit: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    const { error } = await createClient().from("reviews").delete().eq("id", review.id);
    setPending(false);
    if (error) {
      console.error("[reviews] delete failed", error.message);
      setError("No pudimos borrar tu reseña. Inténtalo de nuevo.");
      return;
    }
    await onDeleted();
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-primary-edge bg-accent-soft p-3 text-on-accent-soft">
      <p className="text-sm font-bold">Tu reseña</p>
      <ReviewMeta review={review} />
      {review.body && <p className="whitespace-pre-line break-words">{review.body}</p>}
      {review.status === "hidden" && (
        <Badge variant="warning" className="self-start">
          Oculta tras varios reportes: el equipo la revisará
        </Badge>
      )}
      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="font-bold">¿Seguro que quieres borrar tu reseña?</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void remove()} disabled={pending}>
              {pending ? "Borrando…" : "Sí, borrar"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onEdit}>
            <Icon name="pencil" size={18} />
            Editar
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            <Icon name="trash" size={18} />
            Borrar
          </Button>
        </div>
      )}
      {error && <p role="alert" className="font-bold text-on-warning-soft">{error}</p>}
    </div>
  );
}

function ReviewForm({
  targetType,
  targetId,
  existing,
  onCancel,
  onSaved,
}: {
  targetType: ReviewTargetType;
  targetId: string;
  existing: ReviewListRow | null;
  onCancel?: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const textId = useId();
  const countId = useId();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Elige de 1 a 5 estrellas.");
      return;
    }
    const text = body.trim();
    if (text.length > REVIEW_MAX_LENGTH) {
      setError(`Usa como máximo ${REVIEW_MAX_LENGTH} caracteres.`);
      return;
    }

    setPending(true);
    setError(null);
    const supabase = createClient();
    const values = { rating, body: text || null };
    const { error } = existing
      ? await supabase.from("reviews").update(values).eq("id", existing.id)
      : await supabase.from("reviews").insert({ ...values, target_type: targetType, target_id: targetId });
    setPending(false);

    if (error) {
      console.error("[reviews] save failed", error.code, error.message);
      if (error.code === "23505") {
        // Already reviewed (e.g. in another tab): reload to show it.
        await onSaved("Ya tenías una reseña aquí: puedes editarla.");
        return;
      }
      setError("No pudimos guardar tu reseña. Inténtalo de nuevo.");
      return;
    }
    await onSaved(existing ? "Actualizaste tu reseña." : "¡Gracias por tu reseña!");
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3 rounded-xl border border-border/30 bg-surface p-3">
      <p className="font-bold text-heading">{existing ? "Edita tu reseña" : "Deja tu reseña"}</p>
      <StarInput value={rating} onChange={setRating} legend="Tu calificación" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={textId} className="text-sm font-bold text-heading">
          Comentario (opcional)
        </label>
        <textarea
          id={textId}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={REVIEW_MAX_LENGTH}
          rows={3}
          aria-describedby={countId}
          placeholder="¿Qué te pareció? Cuenta algo útil para otros estudiantes."
          className="rounded-xl border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <p id={countId} className="text-right text-sm text-muted">
          {body.length}/{REVIEW_MAX_LENGTH}
        </p>
      </div>
      {error && (
        <p role="alert" className="font-bold text-on-warning-soft">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : existing ? "Guardar cambios" : "Publicar reseña"}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
