import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { connection } from "next/server";
import { cache, Suspense, type CSSProperties, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { InstallAppButton } from "@/components/InstallAppButton";
import { firstName, getCurrentProfile } from "@/lib/auth";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat";
import { formatShortDate, tipCategoryLabel } from "@/lib/community";
import { countryName } from "@/lib/countries";
import { CURRENCIES, currencyForCountry, formatAmount, type Currency } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { SECTIONS } from "@/lib/sections";
import { wordOfDayIndex } from "@/lib/slang";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio · Aterriza" };

const SHORTCUTS = ["/transporte", "/lugares", "/moneda", "/jerga", "/costumbres", "/aportes"];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Staggered entrance; motion-safe keeps it off with prefers-reduced-motion. */
function rise(step: number): { className: string; style: CSSProperties } {
  return { className: "motion-safe:animate-rise", style: { animationDelay: `${step * 70}ms` } };
}

function Skeleton({ className, label }: { className: string; label?: string }) {
  return (
    <div role={label ? "status" : undefined} className={`animate-pulse rounded-2xl bg-accent-soft ${className}`}>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

/** One rate lookup per request, shared by the mobile widget and the desktop card. */
const getRateOfDay = cache(async () => {
  // Request time only: getExchangeRates may write today's rates.
  await connection();
  const [data, profile] = await Promise.all([getExchangeRates(), getCurrentProfile()]);
  if (!data) return null;
  const origin = currencyForCountry(profile.origin_country);
  // Peru or an unsupported country: show the US dollar instead.
  const quote: Currency = origin && origin !== "PEN" && data.rates[origin] ? origin : "USD";
  const rate = data.rates[quote];
  return rate ? { quote, rate, fetchedAt: data.fetchedAt } : null;
});

// -----------------------------------------------------------------------------
// 1. Header
// -----------------------------------------------------------------------------

async function Greeting() {
  const profile = await getCurrentProfile();
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <h1 className="text-3xl font-extrabold tracking-tight text-heading lg:text-4xl">
        ¡Hola, {firstName(profile.full_name)}!
      </h1>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-edge bg-primary px-3 py-1 text-sm font-bold text-on-primary">
        {countryName(profile.origin_country)}
        <span aria-hidden="true">→</span>
        <span className="sr-only">a</span>
        {profile.destination_city}
      </span>
    </div>
  );
}

function GreetingFallback() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <span className="h-9 w-44 animate-pulse rounded-xl bg-accent-soft" />
      <span className="h-6 w-36 animate-pulse rounded-full bg-accent-soft" />
    </div>
  );
}

async function RateWidget() {
  const rate = await getRateOfDay();
  if (!rate) return null;
  return (
    <Link
      href="/moneda"
      className={`flex shrink-0 flex-col items-end rounded-2xl border border-border/30 bg-surface px-3 py-2 text-right shadow-sm transition-colors hover:bg-hover ${focusRing}`}
    >
      <span className="text-xs font-bold text-muted">Cambio hoy</span>
      <span className="whitespace-nowrap text-sm font-extrabold text-heading">
        S/ 1 = {formatAmount(rate.rate, rate.quote)} {rate.quote}
      </span>
      <span className="sr-only">. Abrir el conversor de moneda.</span>
    </Link>
  );
}

// -----------------------------------------------------------------------------
// 2–4. Left column: ask, photo, shortcuts
// -----------------------------------------------------------------------------

function AskBar() {
  return (
    <Form action="/chat" role="search" aria-label="Pregúntale a Aterriza" className="relative">
      <label htmlFor="ask-input" className="sr-only">
        Pregúntale a Aterriza
      </label>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
        <Icon name="search" size={20} />
      </span>
      <input
        id="ask-input"
        name="q"
        type="search"
        required
        maxLength={MAX_MESSAGE_LENGTH}
        autoComplete="off"
        enterKeyHint="send"
        placeholder="Pregúntale a Aterriza…"
        className={`min-h-14 w-full rounded-full border border-border bg-surface py-3 pl-12 pr-16 text-base text-foreground shadow-sm placeholder:text-muted ${focusRing}`}
      />
      <button
        type="submit"
        aria-label="Preguntar"
        className={`absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary-edge bg-primary text-on-primary transition-colors hover:bg-primary-hover ${focusRing}`}
      >
        <Icon name="send" size={20} />
      </button>
    </Form>
  );
}

function PhotoCard() {
  const button = `flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-on-primary px-4 font-bold text-primary transition-opacity hover:opacity-90 ${focusRing}`;
  return (
    <section
      aria-labelledby="photo-title"
      className="relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-primary-edge bg-primary p-5 text-on-primary shadow-sm lg:p-7"
    >
      {/* Decorative camera in the corner. */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-on-primary/10" />
      <div className="relative flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-on-primary text-primary">
          <Icon name="camera" size={30} />
        </span>
        <h2 id="photo-title" className="text-2xl font-extrabold leading-tight">
          Identifica con una foto
        </h2>
      </div>
      <p className="relative -mt-1 font-semibold">
        Toma una foto de un medicamento o un plato y entiende qué es.
      </p>
      <div className="relative flex gap-3">
        <Link href="/identificar" className={button}>
          <Icon name="pill" size={20} />
          Medicamento
        </Link>
        <Link href="/identificar?tipo=comida" className={button}>
          <Icon name="utensils" size={20} />
          Comida
        </Link>
      </div>
    </section>
  );
}

function Shortcuts() {
  const items = SHORTCUTS.flatMap((href) => SECTIONS.filter((s) => s.href === href));
  return (
    <nav aria-label="Accesos rápidos">
      <ul className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {items.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border/30 bg-surface p-3 text-center text-sm font-bold text-heading shadow-sm transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-hover motion-reduce:hover:translate-y-0 ${focusRing}`}
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
                <Icon name={section.icon} />
              </span>
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// -----------------------------------------------------------------------------
// 5–6. Right column: rate, word of the day, latest tips
// -----------------------------------------------------------------------------

function CardTitle({ icon, children }: { icon: "currency" | "book"; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-muted">
      <Icon name={icon} size={18} />
      {children}
    </h2>
  );
}

async function RateCard() {
  const rate = await getRateOfDay();
  if (!rate) return null;
  const { name } = CURRENCIES[rate.quote];
  return (
    <Link
      href="/moneda"
      className={`flex flex-col gap-2 rounded-2xl border border-border/30 bg-surface p-5 shadow-sm transition-colors hover:bg-hover ${focusRing}`}
    >
      <CardTitle icon="currency">Cambio hoy</CardTitle>
        <p className="text-2xl font-extrabold text-heading">
          S/ 1 = {formatAmount(rate.rate, rate.quote)} {rate.quote}
        </p>
        <p className="text-sm text-muted">
          {name} · referencial, en casas de cambio varía.
        </p>
        <span className="flex items-center gap-1 text-sm font-bold text-link">
          Abrir conversor <Icon name="chevron-right" size={16} />
        </span>
    </Link>
  );
}

async function WordOfDay() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("slang_terms")
    .select("id, term, meaning, equivalent_co")
    .eq("is_published", true)
    .order("id");
  if (error) console.error("[inicio] slang error", error.message);
  const word = data?.[wordOfDayIndex(data.length)];
  if (!word) return null;

  return (
    <Link
      href="/jerga"
      className={`flex flex-col gap-2 rounded-2xl border border-border/30 bg-surface p-5 shadow-sm transition-colors hover:bg-hover ${focusRing}`}
    >
      <CardTitle icon="book">Palabra del día</CardTitle>
        <p className="text-2xl font-extrabold text-heading">«{word.term}»</p>
        <p className="text-foreground">{word.meaning}</p>
        {word.equivalent_co && (
          <p className="text-sm text-muted">
            En Colombia: <span className="font-bold text-heading">{word.equivalent_co}</span>
          </p>
        )}
        <span className="flex items-center gap-1 text-sm font-bold text-link">
          Ver más jerga <Icon name="chevron-right" size={16} />
        </span>
    </Link>
  );
}

async function LatestTips() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_approved_tips", { p_limit: 3 });
  if (error) console.error("[inicio] tips error", error.message);
  if (!data || data.length === 0) return null;

  return (
    <section aria-labelledby="latest-tips" className="flex flex-col gap-2 rounded-2xl border border-border/30 bg-surface p-5 pb-3 shadow-sm">
      <h2 id="latest-tips" className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-muted">
        <Icon name="lightbulb" size={18} />
        Últimos aportes
      </h2>
      <ul className="flex flex-col divide-y divide-border/20">
        {data.map((t) => (
          <li key={t.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <p className="line-clamp-3 break-words text-sm text-foreground">{t.body}</p>
            <p className="text-xs text-muted">
              <span className="font-bold text-heading">{t.author_name}</span> · {tipCategoryLabel(t.category)} ·{" "}
              <time dateTime={t.created_at}>{formatShortDate(t.created_at)}</time>
            </p>
          </li>
        ))}
      </ul>
      <Link
        href="/aportes"
        className={`flex min-h-11 items-center gap-1 self-start rounded-xl text-sm font-bold text-link ${focusRing}`}
      >
        Ver todos y reportar <Icon name="chevron-right" size={16} />
      </Link>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function HomePage() {
  return (
    // data-wide lets the (app) layout grow to 1100 px on desktop.
    <main data-wide className="flex flex-col gap-6 lg:gap-8">
      <header {...rise(0)} className={`flex items-start justify-between gap-3 ${rise(0).className}`}>
        <Suspense fallback={<GreetingFallback />}>
          <Greeting />
        </Suspense>
        <div className="lg:hidden">
          <Suspense fallback={<span aria-hidden="true" className="block h-14 w-32 animate-pulse rounded-2xl bg-accent-soft" />}>
            <RateWidget />
          </Suspense>
        </div>
      </header>

      {/* Mobile: one column in the order below (display: contents). Desktop: two columns. */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div {...rise(1)}>
            <AskBar />
          </div>
          <div {...rise(2)}>
            <PhotoCard />
          </div>
          <div {...rise(3)}>
            <Shortcuts />
          </div>
          <div className="order-last flex flex-col lg:order-none">
            <InstallAppButton />
          </div>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div {...rise(4)} className={`hidden lg:block ${rise(4).className}`}>
            <Suspense fallback={<Skeleton className="h-40" label="Cargando el cambio del día…" />}>
              <RateCard />
            </Suspense>
          </div>
          <div {...rise(4)}>
            <Suspense fallback={<Skeleton className="h-40" label="Cargando la palabra del día…" />}>
              <WordOfDay />
            </Suspense>
          </div>
          <div {...rise(5)} className={`hidden lg:block ${rise(5).className}`}>
            <Suspense fallback={<Skeleton className="h-56" label="Cargando aportes…" />}>
              <LatestTips />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
