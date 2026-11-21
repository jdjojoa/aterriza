import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { getCurrentProfile } from "@/lib/auth";
import {
  BASE_CURRENCY,
  FALLBACK_CURRENCY,
  RATE_ATTRIBUTION,
  RATE_ATTRIBUTION_URL,
  currencyInfo,
  currencyInfos,
  formatRateDate,
  hasRate,
  missingRateNotice,
  quoteCurrencyFor,
  type Currency,
} from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { originCurrency, profileOrigin } from "@/lib/origin";
import { CurrencyConverter } from "./CurrencyConverter";

export const metadata: Metadata = { title: "Moneda · Aterriza" };

/** Shown first in the selectors, in this order, when they have a rate. */
const PINNED: Currency[] = [BASE_CURRENCY, FALLBACK_CURRENCY, "EUR"];

async function ConverterData() {
  // Request time only: getExchangeRates may write today's rates.
  await connection();
  const [data, profile] = await Promise.all([getExchangeRates(), getCurrentProfile()]);
  const origin = profileOrigin(profile);

  if (!data || !hasRate(data.rates, FALLBACK_CURRENCY)) {
    return (
      <EmptyState
        icon="currency"
        title="No pudimos cargar la tasa de cambio"
        description="Revisa tu conexión e inténtalo de nuevo en unos minutos."
      />
    );
  }

  // PEN ↔ the user's currency (USD when the API has no rate for it).
  // National students start with PEN ↔ USD, without a notice.
  const userCurrency = originCurrency(origin);
  const { quote, missing } = quoteCurrencyFor(userCurrency, data.rates);

  // Every currency the API returned: PEN, USD, EUR and the user's first, then by name.
  const infos = currencyInfos([BASE_CURRENCY, ...Object.keys(data.rates)]);
  const pinned = [...PINNED, quote].filter((code, i, list) => infos[code] && list.indexOf(code) === i);
  const rest = Object.values(infos)
    .filter((c) => !pinned.includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const available = [...pinned.map((code) => infos[code]), ...rest];

  return (
    <>
      {missing && (
        <p role="note" className="rounded-xl bg-warning-soft p-3 text-sm font-bold text-on-warning-soft">
          {missingRateNotice(currencyInfo(missing))}
        </p>
      )}
      <CurrencyConverter rates={data.rates} available={available} initialPair={[BASE_CURRENCY, quote]} />
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
          Convierte entre soles, la moneda de tu país y cualquier otra moneda.
        </p>
      </div>
      <Suspense fallback={<ConverterSkeleton />}>
        <ConverterData />
      </Suspense>
    </main>
  );
}
