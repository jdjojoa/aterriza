import type { Metadata } from "next";
import { Suspense } from "react";
import { moderateTip } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/auth";
import { TIP_CATEGORIES } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Aportes · Administración · Aterriza" };

const dateFormat = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

function categoryLabel(category: string | null) {
  return TIP_CATEGORIES.find((c) => c.value === category)?.label ?? category ?? "Sin categoría";
}

async function TipQueue() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: tips, error } = await supabase
    .from("tips")
    .select("id, user_id, category, body, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
        No pudimos cargar los aportes. Inténtalo de nuevo.
      </p>
    );
  }
  if (!tips?.length) {
    return (
      <p className="rounded-2xl border border-border/30 bg-surface p-6 text-center text-muted">
        No hay aportes pendientes.
      </p>
    );
  }

  const userIds = [...new Set(tips.map((t) => t.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
  const authors = new Map(profiles?.map((p) => [p.id, p.full_name?.trim() || "Usuario"]));

  return (
    <ul className="flex flex-col gap-3">
      {tips.map((tip) => (
        <li key={tip.id}>
          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">{categoryLabel(tip.category)}</Badge>
              <span className="text-sm text-muted">
                {authors.get(tip.user_id) ?? "Usuario"} ·{" "}
                <time dateTime={tip.created_at}>{dateFormat.format(new Date(tip.created_at))}</time>
              </span>
            </div>
            <p className="whitespace-pre-line text-foreground">{tip.body}</p>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton action={moderateTip.bind(null, tip.id, "approved")} label="Aprobar" variant="primary" />
              <ActionButton
                action={moderateTip.bind(null, tip.id, "rejected")}
                label="Rechazar"
                confirmMessage="¿Rechazar este aporte?"
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function TipsQueuePage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Aportes pendientes</h1>
        <p className="text-muted">Los aprobados se publican en /aportes con el primer nombre del autor.</p>
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
