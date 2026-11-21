import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { originCountryOptions } from "@/lib/countries";
import { getPeruLocations } from "@/lib/peru-locations";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Bienvenida · Aterriza" };

async function OnboardingData() {
  const departments = await getPeruLocations();
  return <OnboardingForm countries={originCountryOptions()} departments={departments} />;
}

// Access is guarded by src/proxy.ts (session required, not onboarded yet).
export default function OnboardingPage() {
  return (
    <>
      <header className="flex items-center justify-between px-4 pt-4">
        <Logo size={40} />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 pt-6">
        <Suspense fallback={<div role="status" className="h-64 animate-pulse rounded-2xl bg-accent-soft"><span className="sr-only">Cargando…</span></div>}>
          <OnboardingData />
        </Suspense>
      </main>
    </>
  );
}
