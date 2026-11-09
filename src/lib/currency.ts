/** Shared (client-safe) currency helpers for the PEN ⇄ COP converter. */

export const RATE_SOURCE = "ExchangeRate-API";
export const RATE_ATTRIBUTION = "Rates By Exchange Rate API";
export const RATE_ATTRIBUTION_URL = "https://www.exchangerate-api.com";

export type PenCopRate = {
  /** COP per 1 PEN. */
  rate: number;
  /** ISO timestamp of when the rate was fetched. */
  fetchedAt: string;
  source: string;
  /** true when the API failed and this is an older stored rate. */
  stale: boolean;
};

export type Currency = "PEN" | "COP";

export const CURRENCIES: Record<
  Currency,
  { locale: string; symbol: string; label: string; decimals: number }
> = {
  PEN: { locale: "es-PE", symbol: "S/", label: "Soles peruanos (S/)", decimals: 2 },
  COP: { locale: "es-CO", symbol: "$", label: "Pesos colombianos (COP)", decimals: 0 },
};

/** Number without symbol: es-PE "1,234.5", es-CO "1.234.568". */
export function formatAmount(value: number, currency: Currency) {
  const { locale, decimals } = CURRENCIES[currency];
  return new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(value);
}

/**
 * Parses what the user typed, following each locale's separators:
 * es-PE uses "," for thousands and "." for decimals; es-CO the opposite.
 * Returns null for empty or invalid input.
 */
export function parseAmount(text: string, currency: Currency): number | null {
  let clean = text.replace(/[\s$]|S\//g, "");
  if (currency === "COP") {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (!clean.includes(".") && /^\d+,\d{1,2}$/.test(clean)) {
    clean = clean.replace(",", "."); // "2,50" typed Colombian-style
  } else {
    clean = clean.replace(/,/g, "");
  }
  if (!/^\d*\.?\d*$/.test(clean) || !/\d/.test(clean)) return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

/** "9 de noviembre de 2026", in Piura's time zone. */
export function formatRateDate(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date(iso));
}
