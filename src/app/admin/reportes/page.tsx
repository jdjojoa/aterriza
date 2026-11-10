import type { Metadata } from "next";
import { Suspense } from "react";
import { moderateReview } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/ActionButton";
import { StarDisplay } from "@/components/reviews/Stars";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/auth";
import { REPORT_REASONS } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";
import type { ReviewTargetType } from "@/types/database";

export const metadata: Metadata = { title: "Reportes · Administración · Aterriza" };

const TARGET_LABELS: Record<ReviewTargetType, string> = { place: "Lugar", route: "Ruta", food: "Comida" };
const TARGET_TABLES = { place: "places", route: "transport_routes", food: "foods" } as const;

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ReviewSummary = {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  status: "visible" | "hidden";
  report_count: number;
  target_type: ReviewTargetType;
  target_id: string;
  created_at: string;
};

const dateFormat = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

/** "falso: detalle" -> "Falso — detalle" (format written by ReportDialog). */
function formatReason(reason: string) {
  const [key, ...rest] = reason.split(":");
  const label = REPORT_REASONS.find((r) => r.value === key.trim())?.label;
  if (!label) return reason;
  const detail = rest.join(":").trim();
  return detail ? `${label} — ${detail}` : label;
}

/** Target names and author first names for a set of reviews. */
async function loadContext(supabase: Supabase, reviews: ReviewSummary[]) {
  const names = new Map<string, string>();
  await Promise.all(
    (Object.keys(TARGET_TABLES) as ReviewTargetType[]).map(async (type) => {
      const ids = reviews.filter((r) => r.target_type === type).map((r) => r.target_id);
      if (!ids.length) return;
      const { data } = await supabase.from(TARGET_TABLES[type] as "places").select("id, name").in("id", ids);
      data?.forEach((t) => names.set(t.id, t.name));
    }),
  );
  const authors = new Map<string, string>();
  const userIds = [...new Set(reviews.map((r) => r.user_id))];
  if (userIds.length) {
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
    data?.forEach((p) => authors.set(p.id, p.full_name?.trim() || "Usuario"));
  }
  return { names, authors };
}

function ReviewCard({
  review,
  context,
  reasons,
}: {
  review: ReviewSummary;
  context: Awaited<ReturnType<typeof loadContext>>;
  reasons?: { id: string; reason: string; created_at: string }[];
}) {
  const hidden = review.status === "hidden";
  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={hidden ? "warning" : "success"}>{hidden ? "Oculta" : "Visible"}</Badge>
          <span className="text-sm text-muted">
            {TARGET_LABELS[review.target_type]}: {context.names.get(review.target_id) ?? "(eliminado)"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <StarDisplay value={review.rating} label={`${review.rating} de 5 estrellas`} />
          <p className="text-sm font-bold text-heading">{context.authors.get(review.user_id) ?? "Usuario"}</p>
          <p className="whitespace-pre-line text-foreground">{review.body || <em className="text-muted">Sin texto</em>}</p>
        </div>
        {reasons && (
          <div className="flex flex-col gap-1 rounded-xl bg-warning-soft p-3 text-on-warning-soft">
            <p className="text-sm font-bold">
              {reasons.length} {reasons.length === 1 ? "reporte abierto" : "reportes abiertos"} · contador {review.report_count}
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              {reasons.map((r) => (
                <li key={r.id}>
                  {formatReason(r.reason)}{" "}
                  <time dateTime={r.created_at} className="opacity-90">
                    ({dateFormat.format(new Date(r.created_at))})
                  </time>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {hidden ? (
            <ActionButton action={moderateReview.bind(null, review.id, "restore")} label="Restaurar" variant="primary" />
          ) : (
            <ActionButton
              action={moderateReview.bind(null, review.id, "hide")}
              label="Ocultar"
              variant="primary"
              confirmMessage="¿Ocultar esta reseña para todos los usuarios?"
            />
          )}
          {reasons && <ActionButton action={moderateReview.bind(null, review.id, "dismiss")} label="Descartar reportes" />}
        </div>
      </Card>
    </li>
  );
}

async function ReportQueue() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, reason, created_at, review_id, reviews(id, user_id, rating, body, status, report_count, target_type, target_id, created_at)")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(300);

  const { data: hiddenReviews, error: hiddenError } = await supabase
    .from("reviews")
    .select("id, user_id, rating, body, status, report_count, target_type, target_id, created_at")
    .eq("status", "hidden")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error || hiddenError) {
    return (
      <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
        No pudimos cargar los reportes. Inténtalo de nuevo.
      </p>
    );
  }

  // Group open reports by review (oldest first).
  const queue = new Map<string, { review: ReviewSummary; reasons: { id: string; reason: string; created_at: string }[] }>();
  for (const report of reports ?? []) {
    const review = report.reviews as ReviewSummary | null;
    if (!review) continue;
    const entry = queue.get(review.id) ?? { review, reasons: [] };
    entry.reasons.push({ id: report.id, reason: report.reason, created_at: report.created_at });
    queue.set(review.id, entry);
  }
  const queued = [...queue.values()];
  const hiddenOnly = ((hiddenReviews ?? []) as ReviewSummary[]).filter((r) => !queue.has(r.id));
  const context = await loadContext(supabase, [...queued.map((q) => q.review), ...hiddenOnly]);

  return (
    <>
      <section aria-labelledby="open-reports" className="flex flex-col gap-3">
        <h2 id="open-reports" className="text-xl font-extrabold text-heading">
          Reseñas reportadas ({queued.length})
        </h2>
        <p className="text-sm text-muted">
          Ocultar: la reseña deja de verse y los reportes quedan resueltos. Restaurar: vuelve a verse y el
          contador se reinicia. Descartar: cierra los reportes sin cambiar la visibilidad.
        </p>
        {queued.length === 0 ? (
          <p className="rounded-2xl border border-border/30 bg-surface p-6 text-center text-muted">
            No hay reportes abiertos.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {queued.map(({ review, reasons }) => (
              <ReviewCard key={review.id} review={review} context={context} reasons={reasons} />
            ))}
          </ul>
        )}
      </section>
      {hiddenOnly.length > 0 && (
        <section aria-labelledby="hidden-reviews" className="flex flex-col gap-3">
          <h2 id="hidden-reviews" className="text-xl font-extrabold text-heading">
            Reseñas ocultas sin reportes abiertos
          </h2>
          <ul className="flex flex-col gap-3">
            {hiddenOnly.map((review) => (
              <ReviewCard key={review.id} review={review} context={context} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function ReportsPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">Reportes</h1>
      <Suspense
        fallback={
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">Cargando reportes…</span>
            <span aria-hidden="true" className="h-48 animate-pulse rounded-2xl bg-accent-soft" />
            <span aria-hidden="true" className="h-48 animate-pulse rounded-2xl bg-accent-soft" />
          </div>
        }
      >
        <ReportQueue />
      </Suspense>
    </>
  );
}
