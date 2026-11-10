import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AuthErrorNotice } from "@/components/AuthErrorNotice";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

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

/** True when the request carries a valid session (reads cookies: render inside <Suspense>). */
async function hasSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims?.sub);
}

/**
 * Header action: "Entrar" starts Google sign-in (also sign-up: first-time
 * users land on /onboarding), "Ir a la app" when already signed in.
 * Signed-in users who have not finished onboarding are redirected by the proxy.
 */
async function HeaderAuthAction() {
  if (await hasSession()) {
    return (
      <Link href="/inicio" className={buttonClasses("primary", "md")}>
        Ir a la app
      </Link>
    );
  }
  return <GoogleSignInButton label="Entrar" size="md" compact />;
}

async function MainAuthAction() {
  if (await hasSession()) {
    return (
      <Link href="/inicio" className={buttonClasses("primary", "lg", "w-full")}>
        Ir a la app
      </Link>
    );
  }
  return <GoogleSignInButton />;
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/20 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-4 py-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Logo size={36} />
            <span className="hidden text-lg font-extrabold min-[400px]:inline">Aterriza</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Suspense fallback={<div aria-hidden="true" className="h-11 w-24 rounded-xl bg-accent-soft" />}>
              <HeaderAuthAction />
            </Suspense>
          </div>
        </div>
      </header>
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

      <div className="flex flex-col gap-3">
        <Suspense fallback={null}>
          <AuthErrorNotice />
        </Suspense>
        <Suspense fallback={<div aria-hidden="true" className="h-12 w-full rounded-xl bg-accent-soft" />}>
          <MainAuthAction />
        </Suspense>
        <InstallAppButton />
      </div>
      </main>
    </>
  );
}
