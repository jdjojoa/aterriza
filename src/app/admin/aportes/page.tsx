import type { Metadata } from "next";
import { Suspense } from "react";
import { moderateTip } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/auth";
import { REPORTS_TO_HIDE, TIP_CATEGORIES, formatReportReason } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";
import type { TipStatus } from "@/types/database";

export const metadata: Metadata = { title: "Aportes · Administración · Aterriza" };

const dateFormat = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

type TipSummary = {
  id: string;
  user_id: string;
  category: string | null;
  body: string;
  status: TipStatus;
  report_count: number;
  created_at: string;
};
type Reason = { id: string; reason: string; created_at: string };

const TIP_COLUMNS = "id, user_id, category, body, status, report_count, created_at";

function categoryLabel(category: string | null) {
  return TIP_CATEGORIES.find((c) => c.value === category)?.label ?? category ?? "Sin categoría";
}

/**
 * Queue: tips with open reports (still online, or hidden at 3 reports) and
 * tips in 'pending' (hidden by reports, or sent before instant publishing).
 */
async function TipQueue() {
  await requireAdmin();
  const supabase = await createClient();

  const [reportsResult, pendingResult] = await Promise.all([
    supabase
      .from("reports")
      .select(`id, reason, created_at, tip_id, tips(${TIP_COLUMNS})`)
      .eq("status", "open")
      .not("tip_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(300),
    supabase
      .from("tips")
      .select(TIP_COLUMNS)
      .eq("status", "pending")
      .order("updated_at", { ascending: true })
      .limit(100),
  ]);

  if (reportsResult.error || pendingResult.error) {
    return (
      <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
        No pudimos cargar los aportes. Inténtalo de nuevo.
      </p>
    );
  }

  const queue = new Map<string, { tip: TipSummary; reasons: Reason[] }>();
  for (const report of reportsResult.data ?? []) {
    const tip = report.tips as TipSummary | null;
    if (!tip) continue;
    const entry = queue.get(tip.id) ?? { tip, reasons: [] };
    entry.reasons.push({ id: report.id, reason: report.reason, created_at: report.created_at });
    queue.set(tip.id, entry);
  }
  for (const tip of (pendingResult.data ?? []) as TipSummary[]) {
    if (!queue.has(tip.id)) queue.set(tip.id, { tip, reasons: [] });
  }
  // Hidden tips first: they are offline until someone decides.
  const items = [...queue.values()].sort(
    (a, b) => Number(b.tip.status === "pending") - Number(a.tip.status === "pending"),
  );

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-border/30 bg-surface p-6 text-center text-muted">
        No hay aportes reportados ni en revisión.
      </p>
    );
  }

  const userIds = [...new Set(items.map((i) => i.tip.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
  const authors = new Map(profiles?.map((p) => [p.id, p.full_name?.trim() || "Usuario"]));

  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ tip, reasons }) => {
        const hidden = tip.status === "pending";
        return (
          <li key={tip.id}>
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={hidden ? "warning" : "success"}>{hidden ? "Oculto" : "Publicado"}</Badge>
                <Badge>{categoryLabel(tip.category)}</Badge>
                <span className="text-sm text-muted">
                  {authors.get(tip.user_id) ?? "Usuario"} ·{" "}
                  <time dateTime={tip.created_at}>{dateFormat.format(new Date(tip.created_at))}</time>
                </span>
              </div>
              <p className="whitespace-pre-line text-foreground">{tip.body}</p>
              {reasons.length > 0 ? (
                <div className="flex flex-col gap-1 rounded-xl bg-warning-soft p-3 text-on-warning-soft">
                  <p className="text-sm font-bold">
                    {reasons.length} {reasons.length === 1 ? "reporte abierto" : "reportes abiertos"} · contador{" "}
                    {tip.report_count}
                  </p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {reasons.map((r) => (
                      <li key={r.id}>
                        {formatReportReason(r.reason)}{" "}
                        <time dateTime={r.created_at} className="opacity-90">
                          ({dateFormat.format(new Date(r.created_at))})
                        </time>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted">Sin reportes abiertos.</p>
              )}
              <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                <ActionButton
                  action={moderateTip.bind(null, tip.id, "approved")}
                  label={hidden ? "Publicar" : "Mantener publicado"}
                  variant="primary"
                />
                <ActionButton
                  action={moderateTip.bind(null, tip.id, "rejected")}
                  label="Rechazar"
                  confirmMessage="¿Rechazar este aporte? Dejará de verse para todos."
                />
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export default function TipsQueuePage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Aportes reportados</h1>
        <p className="text-muted">
          Los aportes se publican al instante. Con {REPORTS_TO_HIDE} reportes se ocultan y esperan aquí.
          Publicar: vuelve a verse y el contador se reinicia. Rechazar: deja de verse para todos.
        </p>
      </div>
      <Suspense
        fallback={
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">Cargando aportes…</span>
            <span aria-hidden="true" className="h-40 animate-pulse rounded-2xl bg-accent-soft" />
          </div>
        }
      >
        <TipQueue />
      </Suspense>
    </>
  );
}
