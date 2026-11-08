import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const BENEFITS: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Trámites sin enredos",
    text: "Migraciones, carné de extranjería y universidad, paso a paso.",
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3v5h5M9 13l2 2 4-4" />
      </>
    ),
  },
  {
    title: "Piura en tu mano",
    text: "Barrios, transporte y lugares útiles en el mapa.",
    icon: (
      <>
        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
        <path d="M9 4v14M15 6v14" />
      </>
    ),
  },
  {
    title: "Información con fuente",
    text: "Cada dato muestra su fuente oficial y la fecha en que se verificó.",
    icon: (
      <>
        <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pb-10 pt-6">
      <section className="flex flex-col items-center gap-3 text-center">
        <Logo size={96} title="" />
        <h1 className="text-4xl font-extrabold tracking-tight text-heading">
          Aterriza
        </h1>
        <p className="text-lg text-muted">Tu llegada, más fácil</p>
      </section>

      <ul className="flex flex-col gap-3">
        {BENEFITS.map((benefit) => (
          <li key={benefit.title}>
            <Card className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {benefit.icon}
                </svg>
              </span>
              <div>
                <h2 className="font-bold text-heading">{benefit.title}</h2>
                <p className="text-sm text-muted">{benefit.text}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {/* TODO: wire up Supabase Google OAuth. */}
      <Button size="lg" className="w-full">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1Z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
        </svg>
        Entrar con Google
      </Button>
    </main>
  );
}
