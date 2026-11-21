import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ARRIVAL_COLUMNS } from "@/lib/arrival";
import { getCurrentProfile } from "@/lib/auth";
import { profileOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { ROUTE_COLUMNS } from "@/lib/transport";
import { ArrivalRoutes } from "./ArrivalRoutes";
import { RoutesExplorer } from "./RoutesExplorer";
import { TransportTabs } from "./TransportTabs";

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

async function ArrivalData({ city }: { city: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("arrival_routes")
    .select(ARRIVAL_COLUMNS)
    .eq("is_published", true)
    .order("origin_city")
    .order("transport_mode");
  if (error) {
    return (
      <EmptyState
        icon="bus"
        title="No pudimos cargar cómo llegar a Piura"
        description="Revisa tu conexión e inténtalo de nuevo en unos minutos."
      />
    );
  }
  return <ArrivalRoutes city={city} routes={data ?? []} />;
}

/** National students also get "Cómo llegar a Piura", filtered by their city. */
async function TransportContent() {
  const profile = await getCurrentProfile();
  const origin = profileOrigin(profile);
  const routes = (
    <Suspense fallback={<RoutesSkeleton />}>
      <RoutesData />
    </Suspense>
  );
  if (origin.type !== "nacional") return routes;
  return (
    <TransportTabs
      tabs={[
        { id: "piura", label: "Rutas en Piura", content: routes },
        {
          id: "llegar",
          label: "Cómo llegar a Piura",
          content: (
            <Suspense fallback={<RoutesSkeleton />}>
              <ArrivalData city={origin.city} />
            </Suspense>
          ),
        },
      ]}
    />
  );
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
        <TransportContent />
      </Suspense>
    </main>
  );
}
