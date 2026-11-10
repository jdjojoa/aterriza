import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { getCurrentProfile } from "@/lib/auth";
import { formatShortDate, tipCategoryLabel } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";
import type { TipStatus } from "@/types/database";
import { ApprovedTips } from "./ApprovedTips";
import { TipForm } from "./TipForm";

export const metadata: Metadata = { title: "Aportes · Aterriza" };

const STATUS_LABELS: Record<TipStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

function StatusBadge({ status }: { status: TipStatus }) {
  if (status === "approved") return <Badge>{STATUS_LABELS.approved}</Badge>;
  if (status === "pending") return <Badge variant="warning">{STATUS_LABELS.pending}</Badge>;
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-bold text-muted">
      {STATUS_LABELS.rejected}
    </span>
  );
}

async function MyTips() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tips")
    .select("id, category, body, status, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[aportes] own tips failed", error.message);
    return <p className="text-muted">No pudimos cargar tus aportes. Inténtalo de nuevo en unos minutos.</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-muted">Aún no has enviado aportes.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {data.map((t) => (
        <li key={t.id} className="flex flex-col gap-2 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={t.status} />
            <span className="text-sm font-bold text-heading">{tipCategoryLabel(t.category)}</span>
            <time dateTime={t.created_at} className="text-sm text-muted">
              {formatShortDate(t.created_at)}
            </time>
          </div>
          <p className="whitespace-pre-line break-words text-foreground">{t.body}</p>
        </li>
      ))}
    </ul>
  );
}

async function CommunityTips() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_approved_tips", { p_limit: 100 });
  if (error) {
    console.error("[aportes] approved tips failed", error.message);
    return (
      <EmptyState
        icon="lightbulb"
        title="No pudimos cargar los aportes"
        description="Revisa tu conexión e inténtalo de nuevo en unos minutos."
      />
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="lightbulb"
        title="Aún no hay aportes aprobados"
        description="¡Comparte el primero! El equipo revisa cada aporte antes de publicarlo."
      />
    );
  }
  return <ApprovedTips tips={data} />;
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {[0, 1].map((i) => (
        <div key={i} aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-accent-soft" />
      ))}
    </div>
  );
}

export default function TipsPage() {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Aportes</h1>
        <p className="text-muted">
          Comparte un consejo o una experiencia para quienes llegan después. El equipo lo revisa
          antes de publicarlo.
        </p>
      </div>

      <section aria-labelledby="new-tip" className="flex flex-col gap-3">
        <h2 id="new-tip" className="text-xl font-extrabold text-heading">
          Nuevo aporte
        </h2>
        <TipForm />
      </section>

      <section aria-labelledby="my-tips" className="flex flex-col gap-3">
        <h2 id="my-tips" className="text-xl font-extrabold text-heading">
          Mis aportes
        </h2>
        <Suspense fallback={<ListSkeleton label="Cargando tus aportes…" />}>
          <MyTips />
        </Suspense>
      </section>

      <section aria-labelledby="community-tips" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="community-tips" className="text-xl font-extrabold text-heading">
            De la comunidad
          </h2>
          <p className="text-sm text-muted">
            Experiencias personales de otros estudiantes, revisadas por el equipo de Aterriza. No son
            información oficial: confirma los trámites en la fuente correspondiente.
          </p>
        </div>
        <Suspense fallback={<ListSkeleton label="Cargando aportes de la comunidad…" />}>
          <CommunityTips />
        </Suspense>
      </section>
    </main>
  );
}
