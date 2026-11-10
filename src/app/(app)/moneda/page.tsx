import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { getCurrentProfile } from "@/lib/auth";
import {
  BASE_CURRENCY,
  CURRENCY_CODES,
  RATE_ATTRIBUTION,
  RATE_ATTRIBUTION_URL,
  currencyForCountry,
  formatRateDate,
  type Currency,
} from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { CurrencyConverter } from "./CurrencyConverter";

export const metadata: Metadata = { title: "Moneda · Aterriza" };

/** Origin currency if it has a rate; otherwise USD, then the first available. */
function defaultQuote(originCountry: string, available: Currency[]): Currency | null {
  const others: Currency[] = available.filter((c) => c !== BASE_CURRENCY);
  const origin = currencyForCountry(originCountry);
  if (origin && others.includes(origin)) return origin;
  return others.includes("USD") ? "USD" : (others[0] ?? null);
}

async function ConverterData() {
  // Request time only: getExchangeRates may write today's rates.
  await connection();
  const [data, profile] = await Promise.all([getExchangeRates(), getCurrentProfile()]);

  // Hide currencies the API did not return.
  const available = CURRENCY_CODES.filter(
    (code) => code === BASE_CURRENCY || data?.rates[code] !== undefined,
  );
  const quote = defaultQuote(profile.origin_country, available);

  if (!data || !quote) {
    return (
      <EmptyState
        icon="currency"
        title="No pudimos cargar la tasa de cambio"
        description="Revisa tu conexión e inténtalo de nuevo en unos minutos."
      />
    );
  }

  return (
    <>
      <CurrencyConverter
        rates={data.rates}
        available={available}
        initialPair={[BASE_CURRENCY, quote]}
      />
      <p className="text-sm text-muted">
        Tasas del{" "}
        <time dateTime={data.fetchedAt}>{formatRateDate(data.fetchedAt)}</time>.
        Referenciales; en casas de cambio varían.
      </p>
      <SourceBadge
        sourceName={RATE_ATTRIBUTION}
        sourceUrl={RATE_ATTRIBUTION_URL}
        verifiedAt={data.fetchedAt}
      />
    </>
  );
}

function ConverterSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando tasas de cambio…</span>
      <div aria-hidden="true" className="h-64 animate-pulse rounded-2xl bg-accent-soft" />
      <div aria-hidden="true" className="h-12 animate-pulse rounded-2xl bg-accent-soft" />
    </div>
  );
}

export default function CurrencyPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Moneda</h1>
        <p className="text-muted">
          Convierte entre soles, la moneda de tu país y otras monedas de la región.
        </p>
      </div>
      <Suspense fallback={<ConverterSkeleton />}>
        <ConverterData />
      </Suspense>
    </main>
  );
}
