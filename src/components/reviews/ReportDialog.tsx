"use client";

import { useId, useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import {
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_REASONS,
  type ReportReason,
} from "@/lib/community";
import type { ReviewListRow } from "@/types/database";

const THANKS = "Gracias, el equipo lo revisará.";

type ReportDialogProps = {
  /** Review being reported; null keeps the dialog closed. */
  review: ReviewListRow | null;
  onClose: () => void;
  onReported: (reviewId: string) => void;
};

/** Modal to report someone else's review. One report per user and review (DB unique). */
export function ReportDialog({ review, onClose, onReported }: ReportDialogProps) {
  return (
    <BottomSheet open={review !== null} onClose={onClose} title="Reportar reseña">
      {/* key: fresh form state for each review. */}
      {review && <ReportForm key={review.id} review={review} onClose={onClose} onReported={onReported} />}
    </BottomSheet>
  );
}

function ReportForm({ review, onClose, onReported }: { review: ReviewListRow } & Omit<ReportDialogProps, "review">) {
  const name = useId();
  const detailId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason) {
      setError("Elige un motivo.");
      return;
    }
    const extra = detail.trim().slice(0, REPORT_DETAIL_MAX_LENGTH);
    if (reason === "otro" && !extra) {
      setError("Cuéntanos brevemente el motivo.");
      return;
    }

    setPending(true);
    setError(null);
    // No .select(): reports are admin-only reads, so RETURNING would fail RLS.
    const { error } = await createClient()
      .from("reports")
      .insert({ review_id: review.id, reason: extra ? `${reason}: ${extra}` : reason });
    setPending(false);

    // 23505 = this user already reported this review: same outcome for them.
    if (error && error.code !== "23505") {
      console.error("[reports] insert failed", error.code, error.message);
      setError("No pudimos enviar el reporte. Inténtalo de nuevo.");
      return;
    }
    setDone(true);
    onReported(review.id);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="rounded-xl bg-accent-soft p-3 font-bold text-on-accent-soft">
          {THANKS}
        </p>
        <Button onClick={onClose} className="w-full">
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <p className="text-muted">
        Reseña de <span className="font-bold text-heading">{review.author_name}</span>. Tu reporte es
        anónimo para el autor.
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold text-heading">¿Por qué la reportas?</legend>
        {REPORT_REASONS.map((r) => (
          <label
            key={r.value}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 border-border/40 p-3 hover:bg-hover has-[:checked]:border-primary-edge has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
          >
            <input
              type="radio"
              name={name}
              value={r.value}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="mt-1 size-4 accent-[var(--primary-edge)]"
            />
            <span className="flex flex-col">
              <span className="font-bold text-heading">{r.label}</span>
              <span className="text-sm text-muted">{r.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {reason === "otro" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={detailId} className="text-sm font-bold text-heading">
            Cuéntanos qué pasa
          </label>
          <textarea
            id={detailId}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={REPORT_DETAIL_MAX_LENGTH}
            rows={3}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="font-bold text-on-warning-soft">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Enviando…" : "Enviar reporte"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={pending} className="w-full">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
