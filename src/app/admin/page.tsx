import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons/Icon";
import { requireAdmin } from "@/lib/admin/auth";
import { CONTENT_CONFIG, CONTENT_TABLES } from "@/lib/admin/content-config";
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
  await requireAdmin();
  const supabase = await createClient();

  const [reports, tips, ...unverified] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("tips").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ...CONTENT_TABLES.map((table) =>
      supabase.from(table as "customs").select("id", { count: "exact", head: true }).is("verified_at", null),
    ),
  ]);

  const queues: Counter[] = [
    { href: "/admin/reportes", label: "Reportes abiertos", value: reports.count, urgent: (reports.count ?? 0) > 0 },
    { href: "/admin/aportes", label: "Aportes pendientes", value: tips.count, urgent: (tips.count ?? 0) > 0 },
  ];
  const tables: Counter[] = CONTENT_TABLES.map((table, i) => ({
    href: `/admin/contenido/${table}?sin_verificar=1`,
    label: CONTENT_CONFIG[table].label,
    value: unverified[i].count,
    urgent: false,
  }));
  const failed = [reports, tips, ...unverified].some((r) => r.error);

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
          Filas sin verificar
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
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
