import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Sin conexión · Aterriza" };

/** Fallback served by public/sw.js when a page is requested without network. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <Logo size={88} title="" />
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">
        Sin conexión
      </h1>
      <p className="text-lg text-muted">
        No pudimos cargar esta página. Revisa tu conexión a internet o tus datos
        móviles e inténtalo de nuevo.
      </p>
      {/* A plain link works even if no JavaScript is cached. */}
      <a href="/inicio" className={buttonClasses("primary", "lg")}>
        Reintentar
      </a>
    </main>
  );
}
