import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { SLANG_COLUMNS } from "@/lib/slang";
import { createClient } from "@/lib/supabase/server";
import { SlangExplorer } from "./SlangExplorer";

export const metadata: Metadata = { title: "Jerga · Aterriza" };

async function SlangData() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("slang_terms")
    .select(SLANG_COLUMNS)
    .eq("is_published", true)
    .order("term");

  if (error) {
    return (
      <EmptyState
        icon="book"
        title="No pudimos cargar la jerga"
        description="Revisa tu conexión e inténtalo de nuevo en unos minutos."
      />
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="book"
        title="Aún no hay palabras publicadas"
        description="Estamos verificando la información. Vuelve pronto."
      />
    );
  }
  return <SlangExplorer terms={data} />;
}

function SlangSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando jerga…</span>
      <div aria-hidden="true" className="h-11 animate-pulse rounded-xl bg-accent-soft" />
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

export default function SlangPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Jerga</h1>
        <p className="text-muted">
          Palabras peruanas y piuranas, con su equivalente en Colombia.
        </p>
      </div>
      <Suspense fallback={<SlangSkeleton />}>
        <SlangData />
      </Suspense>
    </main>
  );
}
