import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { FOOD_COLUMNS, toFoodCard, type FoodCard } from "@/lib/foods";
import { getUsage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { IdentifyClient } from "./IdentifyClient";

export const metadata: Metadata = { title: "Identificar · Aterriza" };

async function loadFoods(): Promise<FoodCard[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .eq("is_published", true)
    .order("name");
  if (error) {
    console.error("[identificar] foods error", error.message);
    return null;
  }
  return data.map(toFoodCard);
}

async function IdentifyData() {
  const profile = await getCurrentProfile();
  const [usage, foods] = await Promise.all([getUsage(profile.id, "photo_medicine"), loadFoods()]);
  return <IdentifyClient initialRemaining={usage.remaining} limit={usage.limit} foods={foods} />;
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

export default function IdentifyPage() {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">Identificar</h1>
      <Suspense fallback={<IdentifySkeleton />}>
        <IdentifyData />
      </Suspense>
    </main>
  );
}
