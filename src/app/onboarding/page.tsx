import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Bienvenida · Aterriza" };

// Access is guarded by src/proxy.ts (session required, not onboarded yet).
export default function OnboardingPage() {
  return (
    <>
      <header className="flex items-center justify-between px-4 pt-4">
        <Logo size={40} />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 pt-6">
        <OnboardingForm />
      </main>
    </>
  );
}
