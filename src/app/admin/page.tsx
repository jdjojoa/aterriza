import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { GeminiQuotaCard } from "@/components/admin/GeminiQuota";
import { Icon } from "@/components/icons/Icon";
import { requireAdmin } from "@/lib/admin/auth";
import { CONTENT_CONFIG, VERIFIED_TABLES } from "@/lib/admin/content-config";
import { getGeminiQuota } from "@/lib/admin/gemini-quota";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administración · Aterriza" };

type Counter = { href: string; label: string; value: number | null; urgent: boolean };

function CounterCard({ href, label, value, urgent }: Counter) {
  return (
    <li>
      <Link
        href={href}
        className={`flex min-h-24 flex-col justify-between gap-2 rounded-2xl border p-4 shadow-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          urgent ? "border-on-warning-soft/40 bg-warning-soft text-on-warning-soft" : "border-border/30 bg-surface text-heading"
        }`}
      >
        <span className="text-sm font-bold">{label}</span>
        <span className="flex items-end justify-between">
          <span className="text-3xl font-extrabold tabular-nums">{value ?? "—"}</span>
          <Icon name="chevron-right" />
        </span>
      </Link>
    </li>
  );
}

async function Dashboard() {
  await connection();
  await requireAdmin();
  const supabase = await createClient();

  const [reports, tipReports, hiddenTips, ...unverified] = await Promise.all([
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .not("review_id", "is", null),
    supabase.from("reports").select("tip_id").eq("status", "open").not("tip_id", "is", null).limit(1000),
    supabase.from("tips").select("id").eq("status", "pending").limit(1000),
    ...VERIFIED_TABLES.map((table) =>
      supabase.from(table as "customs").select("id", { count: "exact", head: true }).is("verified_at", null),
    ),
  ]);

  // Distinct tips in the /admin/aportes queue: reported or hidden.
  const tipQueue =
    tipReports.error || hiddenTips.error
      ? null
      : new Set([...(tipReports.data ?? []).map((r) => r.tip_id), ...(hiddenTips.data ?? []).map((t) => t.id)]).size;
  const queues: Counter[] = [
    { href: "/admin/reportes", label: "Reseñas reportadas", value: reports.count, urgent: (reports.count ?? 0) > 0 },
    { href: "/admin/aportes", label: "Aportes reportados", value: tipQueue, urgent: (tipQueue ?? 0) > 0 },
  ];
  const tables: Counter[] = VERIFIED_TABLES.map((table, i) => ({
    href: `/admin/contenido/${table}?sin_verificar=1`,
    label: CONTENT_CONFIG[table].label,
    value: unverified[i].count,
    urgent: false,
  }));
  const failed = [reports, tipReports, hiddenTips, ...unverified].some((r) => r.error);

  return (
    <>
      {failed && (
        <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
          Algunos contadores no se pudieron cargar («—»). Revisa la conexión o las políticas RLS.
        </p>
      )}
      <section aria-labelledby="queues" className="flex flex-col gap-3">
        <h2 id="queues" className="text-xl font-extrabold text-heading">
          Moderación
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {queues.map((c) => (
            <CounterCard key={c.href} {...c} />
          ))}
        </ul>
      </section>
      <section aria-labelledby="unverified" className="flex flex-col gap-3">
        <h2 id="unverified" className="text-xl font-extrabold text-heading">
          Medicamentos y rutas sin verificar
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tables.map((c) => (
            <CounterCard key={c.href} {...c} />
          ))}
        </ul>
      </section>
    </>
  );
}

/** Gemini free-tier meter. getGeminiQuota checks the admin role itself. */
async function GeminiQuotaSection() {
  await connection();
  return <GeminiQuotaCard quota={await getGeminiQuota()} />;
}

function DashboardSkeleton() {
  return (
    <div role="status" className="grid grid-cols-2 gap-3">
      <span className="sr-only">Cargando contadores…</span>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span key={i} aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-accent-soft" />
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">Administración</h1>
      <Suspense
        fallback={
          <div role="status" className="h-96 animate-pulse rounded-2xl bg-accent-soft">
            <span className="sr-only">Cargando la cuota de Gemini…</span>
          </div>
        }
      >
        <GeminiQuotaSection />
      </Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
