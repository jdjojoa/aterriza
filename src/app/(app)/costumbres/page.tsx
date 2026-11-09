import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { CUSTOM_COLUMNS } from "@/lib/customs";
import { createClient } from "@/lib/supabase/server";
import { CustomsExplorer } from "./CustomsExplorer";

export const metadata: Metadata = { title: "Costumbres · Aterriza" };

async function CustomsData() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customs")
    .select(CUSTOM_COLUMNS)
    .eq("is_published", true)
    .order("title");

  if (error) {
    return (
      <EmptyState
        icon="globe"
        title="No pudimos cargar las costumbres"
        description="Revisa tu conexión e inténtalo de nuevo en unos minutos."
      />
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="globe"
        title="Aún no hay costumbres publicadas"
        description="Estamos verificando la información. Vuelve pronto."
      />
    );
  }
  return <CustomsExplorer customs={data} />;
}

function CustomsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando costumbres…</span>
      <div aria-hidden="true" className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-11 w-24 shrink-0 animate-pulse rounded-full bg-accent-soft" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="h-40 animate-pulse rounded-2xl bg-accent-soft" />
      ))}
    </div>
  );
}

export default function CustomsPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Costumbres</h1>
        <p className="text-muted">
          Cómo se saluda, se come, se paga y se cuida uno en Piura.
        </p>
      </div>
      <Suspense fallback={<CustomsSkeleton />}>
        <CustomsData />
      </Suspense>
    </main>
  );
}
