import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { AuthErrorNotice } from "@/components/AuthErrorNotice";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "@/components/icons/Icon";
import { AnimatedTitle } from "@/components/landing/AnimatedTitle";
import { CountUp } from "@/components/landing/CountUp";
import { HeroMark } from "@/components/landing/HeroMark";
import { RouteMap } from "@/components/landing/RouteMap";
import { buttonClasses } from "@/components/ui/Button";
import { DIGEMID_URL } from "@/lib/identify";
import { SECTIONS } from "@/lib/sections";
import { createClient } from "@/lib/supabase/server";
import "./landing.css";

const STEPS: { title: string; text: string; icon: IconName }[] = [
  {
    title: "Foto",
    text: "Toma una foto de un medicamento, una comida o un producto que no reconoces.",
    icon: "camera",
  },
  {
    title: "Respuesta",
    text: "Aterriza te dice qué es y cómo se le conoce en Piura. Para medicamentos, un equivalente referencial con su fuente.",
    icon: "chat",
  },
  {
    title: "Te mueves por Piura",
    text: "Con rutas de transporte, lugares en el mapa y la jerga local, sales a la calle con confianza.",
    icon: "map-pin",
  },
];

/** Survey results (34 respondents). Real data: do not round or embellish. */
const STATS: { value: number; text: string }[] = [
  { value: 94.1, text: "se mostró interesado en una app como Aterriza" },
  { value: 85.3, text: "valora poder identificar productos con una foto" },
  { value: 88.2, text: "la recomendaría" },
];

const FEATURES = SECTIONS.filter((section) => section.href !== "/inicio");

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

async function MainAuthAction({ label }: { label: string }) {
  if (await hasSession()) {
    return (
      <Link href="/inicio" className={buttonClasses("primary", "lg", "w-full")}>
        Ir a la app
      </Link>
    );
  }
  return <GoogleSignInButton label={label} />;
}

function AuthActionFallback() {
  return <div aria-hidden="true" className="h-12 w-full rounded-xl bg-accent-soft" />;
}

function SectionHeading({ id, eyebrow, title, text }: { id: string; eyebrow: string; title: string; text?: string }) {
  return (
    <div className="reveal mx-auto flex max-w-2xl flex-col gap-2 text-center">
      <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
      <h2 id={id} className="scroll-mt-24 text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">
        {title}
      </h2>
      {text && <p className="text-lg text-muted">{text}</p>}
    </div>
  );
}

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-3.75rem)] flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-6"
    >
      <div className="parallax-hero absolute inset-0 -z-20">
        <RouteMap className="size-full" />
      </div>
      <div aria-hidden="true" className="hero-veil absolute inset-0 -z-10" />

      <div className="parallax-lift flex w-full max-w-xl flex-col items-center gap-5 text-center">
        <HeroMark className="size-44 sm:size-56 lg:size-64" />
        <p className="hero-fade rounded-full border border-border/30 bg-surface/80 px-3 py-1 text-sm font-bold text-heading backdrop-blur" style={{ "--delay": "0.2s" } as CSSProperties}>
          Colombia → Piura, Perú
        </p>
        <AnimatedTitle
          text="Tu llegada, más fácil"
          className="text-[2.6rem] font-black leading-[1.05] tracking-tight text-heading min-[400px]:text-5xl sm:text-6xl lg:text-7xl"
        />
        <p className="hero-fade max-w-md text-lg text-foreground sm:text-xl" style={{ "--delay": "0.6s" } as CSSProperties}>
          La guía para estudiantes colombianos que llegan a Piura: identifica productos con una foto, pregunta lo que necesites y muévete por la ciudad.
        </p>
        <div className="hero-fade flex w-full max-w-xs flex-col gap-3" style={{ "--delay": "1.3s" } as CSSProperties}>
          <Suspense fallback={null}>
            <AuthErrorNotice />
          </Suspense>
          <Suspense fallback={<AuthActionFallback />}>
            <MainAuthAction label="Empezar con Google" />
          </Suspense>
          <a
            href="#como-funciona"
            className="rounded-xl py-2 font-bold text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Ver cómo funciona
          </a>
        </div>
      </div>

      <a
        href="#como-funciona"
        aria-label="Bajar a Cómo funciona"
        className="hero-fade absolute bottom-4 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full text-muted hover:text-heading focus-visible:outline-2 focus-visible:outline-ring"
        style={{ "--delay": "2s" } as CSSProperties}
      >
        <span className="motion-safe:animate-bounce">
          <Icon name="chevron-down" size={26} />
        </span>
      </a>
    </section>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="como-funciona" className="px-4 py-20">
      <SectionHeading
        id="como-funciona"
        eyebrow="Cómo funciona"
        title="De la duda a la calle en 3 pasos"
      />
      <ol className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3 md:gap-6">
        {STEPS.map((step, i) => (
          <li key={step.title} className="reveal relative flex gap-4 md:flex-col md:items-center md:text-center">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="step-line absolute left-[calc(2rem-1px)] top-[4.75rem] h-[calc(100%-3.5rem)] w-0.5 rounded-full bg-primary-edge/60 md:left-[calc(50%+3rem)] md:top-[calc(2rem-1px)] md:h-0.5 md:w-[calc(100%-4.5rem)]"
              />
            )}
            <span className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl border-2 border-primary-edge bg-primary text-on-primary shadow-lg">
              <Icon name={step.icon} size={30} />
              <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-heading text-sm font-black text-background">
                {i + 1}
              </span>
            </span>
            <div className="flex flex-col gap-1 pt-1">
              <h3 className="text-xl font-extrabold text-heading">{step.title}</h3>
              <p className="text-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="reveal mx-auto mt-10 max-w-xl rounded-2xl bg-warning-soft p-4 text-center text-sm font-bold text-on-warning-soft">
        Aterriza nunca da dosis ni diagnósticos. Confirma siempre un medicamento en{" "}
        <a href={DIGEMID_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          DIGEMID
        </a>
        .
      </p>
    </section>
  );
}

function Features() {
  return (
    <section aria-labelledby="funciones" className="relative isolate overflow-hidden bg-surface/60 px-4 py-20">
      <div
        aria-hidden="true"
        className="parallax-slow absolute -right-24 top-10 -z-10 size-72 rounded-full bg-primary/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="parallax-slow absolute -left-24 bottom-0 -z-10 size-64 rounded-full bg-accent-soft blur-3xl"
      />
      <SectionHeading
        id="funciones"
        eyebrow="Funciones"
        title="Todo lo que necesitas al llegar"
        text="Pasa el mouse o toca una tarjeta."
      />
      <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <li key={feature.href} className="reveal">
            <div className="feature-card relative isolate flex h-full cursor-default flex-col gap-3 overflow-hidden rounded-2xl border border-border/30 bg-surface p-5 shadow-sm hover:border-primary-edge hover:shadow-xl active:border-primary-edge">
              <span className="feature-icon flex size-12 items-center justify-center rounded-xl bg-primary text-on-primary">
                <Icon name={feature.icon} size={24} />
              </span>
              <h3 className="text-lg font-extrabold text-heading">{feature.label}</h3>
              <p className="text-sm text-foreground">{feature.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Trust() {
  return (
    <section aria-labelledby="confianza" className="px-4 py-20">
      <SectionHeading
        id="confianza"
        eyebrow="Hecho con estudiantes"
        title="Lo pedimos, lo construimos"
        text="Antes de crear Aterriza preguntamos a 34 personas qué necesitaban al llegar."
      />
      <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
        {STATS.map((stat) => (
          <li
            key={stat.text}
            className="reveal flex items-center gap-4 rounded-2xl border border-border/30 bg-surface p-5 shadow-sm sm:flex-col sm:text-center"
          >
            <svg viewBox="0 0 44 44" className="size-20 shrink-0 -rotate-90 sm:size-28" aria-hidden="true">
              <circle cx="22" cy="22" r="18" fill="none" strokeWidth="5" className="stroke-accent-soft" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                className="stat-ring__value stroke-primary-edge"
                style={{ strokeDashoffset: 100 - stat.value }}
              />
            </svg>
            <div className="flex flex-col gap-1">
              <p className="text-4xl font-black text-heading">
                <CountUp value={stat.value} decimals={1} suffix={" %"} />
              </p>
              <p className="text-foreground">{stat.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="reveal mt-6 text-center text-sm text-muted">
        Fuente: encuesta de Aterriza a 34 personas.
      </p>
    </section>
  );
}

function FinalCta() {
  return (
    <section aria-labelledby="cta" className="px-4 pb-16">
      {/* Forced dark tokens: the panel is navy in both themes. */}
      <div className="dark reveal relative isolate mx-auto flex max-w-4xl flex-col items-center gap-6 overflow-hidden rounded-3xl border border-border/40 bg-[#1B3A66] px-6 py-14 text-center text-foreground shadow-2xl">
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40">
          <RouteMap className="size-full" labels={false} />
        </div>
        <Logo size={72} title="" />
        <h2 id="cta" className="text-3xl font-black tracking-tight text-heading sm:text-5xl">
          ¿Listo para aterrizar?
        </h2>
        <p className="max-w-md text-lg">
          Entra con tu cuenta de Google y ten Piura a la mano desde el primer día.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Suspense fallback={<AuthActionFallback />}>
            <MainAuthAction label="Empezar con Google" />
          </Suspense>
          <InstallAppButton />
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-2">
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
      <main className="flex-1 overflow-x-clip">
        <Hero />
        <HowItWorks />
        <Features />
        <Trust />
        <FinalCta />
      </main>
      <footer className="border-t border-border/20 px-4 py-6 text-center text-sm text-muted">
        Aterriza · Guía para estudiantes colombianos en Piura, Perú
      </footer>
    </>
  );
}
