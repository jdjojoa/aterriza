import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { countryEquivalent, loadEquivalents } from "@/lib/equivalents";
import { FOOD_COLUMNS, toFoodCard, type FoodCard } from "@/lib/foods";
import { equivalentCountry, profileOrigin } from "@/lib/origin";
import { getUsage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { IdentifyClient } from "./IdentifyClient";

export const metadata: Metadata = { title: "Identificar · Aterriza" };

/** Published dishes with "Parecido en {país}" for the user's country. */
async function loadFoods(country: string | null): Promise<FoodCard[] | null> {
  const supabase = await createClient();
  const [{ data, error }, similar] = await Promise.all([
    supabase.from("foods").select(FOOD_COLUMNS).eq("is_published", true).order("name"),
    loadEquivalents(supabase, "food", country),
  ]);
  if (error) {
    console.error("[identificar] foods error", error.message);
    return null;
  }
  return data.map((f) => toFoodCard(f, countryEquivalent(country, similar.get(f.id))));
}

async function IdentifyData({ searchParams }: { searchParams: PageProps<"/identificar">["searchParams"] }) {
  const { tipo } = await searchParams;
  const initialTab = tipo === "comida" ? "food" : "medicine"; // ?tipo=medicamento or none → medicine
  const profile = await getCurrentProfile();
  const country = equivalentCountry(profileOrigin(profile));
  const [usage, foods] = await Promise.all([getUsage(profile.id, "photo_medicine"), loadFoods(country)]);
  return <IdentifyClient initialTab={initialTab} initialRemaining={usage.remaining} limit={usage.limit} foods={foods} />;
}

function IdentifySkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Cargando…</span>
      <span aria-hidden="true" className="h-11 w-full animate-pulse rounded-xl bg-accent-soft" />
      <span aria-hidden="true" className="h-40 w-full animate-pulse rounded-2xl bg-accent-soft" />
    </div>
  );
}

export default function IdentifyPage({ searchParams }: PageProps<"/identificar">) {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">Identificar</h1>
      <Suspense fallback={<IdentifySkeleton />}>
        <IdentifyData searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
