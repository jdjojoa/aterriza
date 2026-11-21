import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal";
import { parseLegalMarkdown } from "./LegalMarkdown";

export type LegalDocument = "privacidad" | "terminos";

/** Reads src/content/legal/{name}.md (at build time: these pages are static). */
export async function loadLegalDocument(name: LegalDocument) {
  const file = path.join(process.cwd(), "src", "content", "legal", `${name}.md`);
  return parseLegalMarkdown(await readFile(file, "utf8"));
}

const linkClass =
  "rounded font-bold text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Public page with the app header, for /privacidad and /terminos. */
export async function LegalPage({ name }: { name: LegalDocument }) {
  const { title, body } = await loadLegalDocument(name);
  return (
    <>
      <header className="border-b border-border/30 bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2">
          <Link
            href="/"
            className="logo-hover flex items-center gap-2 rounded-xl font-extrabold text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Logo size={32} title="" />
            Aterriza
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-12 pt-6 leading-relaxed text-foreground">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">{title}</h1>
        {body}
        <nav aria-label="Documentos legales" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/30 pt-4 text-sm">
          {name === "privacidad" ? (
            <Link href={TERMS_PATH} className={linkClass}>
              Términos de uso
            </Link>
          ) : (
            <Link href={PRIVACY_PATH} className={linkClass}>
              Política de privacidad
            </Link>
          )}
          <Link href="/" className={linkClass}>
            Volver a Aterriza
          </Link>
        </nav>
      </main>
    </>
  );
}
