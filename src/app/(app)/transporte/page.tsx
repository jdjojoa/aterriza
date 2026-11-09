import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { ROUTE_COLUMNS } from "@/lib/transport";
import { RoutesExplorer } from "./RoutesExplorer";

export const metadata: Metadata = { title: "Transporte · Aterriza" };

async function RoutesData() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transport_routes")
    .select(ROUTE_COLUMNS)
    .eq("is_published", true)
    .order("name");

  if (error) {
    return (
      <EmptyState
        icon="bus"
        title="No pudimos cargar las rutas"
        description="Revisa tu conexión e inténtalo de nuevo en unos minutos."
      />
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="bus"
        title="Aún no hay rutas publicadas"
        description="Estamos verificando recorridos y tarifas. Vuelve pronto."
      />
    );
  }
  return <RoutesExplorer routes={data} />;
}

function RoutesSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando rutas…</span>
      <div aria-hidden="true" className="h-64 animate-pulse rounded-2xl bg-accent-soft" />
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-accent-soft" />
      ))}
    </div>
  );
}

export default function TransportPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Transporte</h1>
        <p className="text-muted">
          Combis, mototaxis y colectivos para moverte por Piura.
        </p>
      </div>
      <Suspense fallback={<RoutesSkeleton />}>
        <RoutesData />
      </Suspense>
    </main>
  );
}
