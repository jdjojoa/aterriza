import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { PLACE_COLUMNS } from "@/lib/places";
import { PlacesExplorer } from "./PlacesExplorer";

export const metadata: Metadata = { title: "Lugares · Aterriza" };

async function PlacesData() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("places")
    .select(PLACE_COLUMNS)
    .eq("is_published", true)
    .order("name");

  if (error) {
    return (
      <EmptyState
        icon="map-pin"
        title="No pudimos cargar los lugares"
        description="Revisa tu conexión e inténtalo de nuevo en unos minutos."
      />
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="map-pin"
        title="Aún no hay lugares publicados"
        description="Estamos verificando la información. Vuelve pronto."
      />
    );
  }
  return <PlacesExplorer places={data} />;
}

function PlacesSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando lugares…</span>
      <div aria-hidden="true" className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-11 w-24 shrink-0 animate-pulse rounded-full bg-accent-soft" />
        ))}
      </div>
      <div aria-hidden="true" className="h-[55dvh] animate-pulse rounded-2xl bg-accent-soft" />
    </div>
  );
}

export default function PlacesPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Lugares</h1>
        <p className="text-muted">
          Salud, trámites, comida y universidades en Piura.
        </p>
      </div>
      <Suspense fallback={<PlacesSkeleton />}>
        <PlacesData />
      </Suspense>
    </main>
  );
}
