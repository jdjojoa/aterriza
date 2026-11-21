import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AcceptTermsForm } from "./AcceptTermsForm";

export const metadata: Metadata = { title: "Términos y privacidad · Aterriza" };

// Access is guarded by src/proxy.ts: only signed-in, onboarded users who have
// not accepted the terms yet.
export default async function AcceptTermsPage(props: PageProps<"/aceptar-terminos">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : "/inicio";
  return (
    <>
      <header className="flex items-center justify-between px-4 pt-4">
        <Logo size={40} />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-10 pt-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Antes de seguir</h1>
        <p className="text-foreground">
          Publicamos los Términos de uso y la Política de privacidad de Aterriza. Léelos y confírmanos que estás de
          acuerdo. Solo te lo pedimos una vez.
        </p>
        <AcceptTermsForm next={nextPath} />
      </main>
    </>
  );
}
