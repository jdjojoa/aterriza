import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { SourceBadge } from "@/components/ui/SourceBadge";
import {
  RATE_ATTRIBUTION,
  RATE_ATTRIBUTION_URL,
  formatAmount,
  formatRateDate,
} from "@/lib/currency";
import { getPenCopRate } from "@/lib/exchange-rates";
import { CurrencyConverter } from "./CurrencyConverter";

export const metadata: Metadata = { title: "Moneda · Aterriza" };

async function ConverterData() {
  // Request time only: getPenCopRate may write today's rate.
  await connection();
  const rate = await getPenCopRate();

  if (!rate) {
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
      <CurrencyConverter rate={rate.rate} />
      <div className="flex flex-col gap-1">
        <p className="font-bold text-heading">
          S/ 1 = $ {formatAmount(rate.rate, "COP")} COP
        </p>
        <p className="text-sm text-muted">
          Tasa del{" "}
          <time dateTime={rate.fetchedAt}>{formatRateDate(rate.fetchedAt)}</time>.
          Referencial; en casas de cambio varía.
        </p>
      </div>
      <SourceBadge
        sourceName={RATE_ATTRIBUTION}
        sourceUrl={RATE_ATTRIBUTION_URL}
        verifiedAt={rate.fetchedAt}
      />
    </>
  );
}

function ConverterSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando tasa de cambio…</span>
      <div aria-hidden="true" className="h-56 animate-pulse rounded-2xl bg-accent-soft" />
      <div aria-hidden="true" className="h-12 animate-pulse rounded-2xl bg-accent-soft" />
    </div>
  );
}

export default function CurrencyPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Moneda</h1>
        <p className="text-muted">Convierte entre soles peruanos y pesos colombianos.</p>
      </div>
      <Suspense fallback={<ConverterSkeleton />}>
        <ConverterData />
      </Suspense>
    </main>
  );
}
