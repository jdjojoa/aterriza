/** Shared (client-safe) currency helpers for the multi-currency converter. */

export const RATE_SOURCE = "ExchangeRate-API";
export const RATE_ATTRIBUTION = "Rates By Exchange Rate API";
export const RATE_ATTRIBUTION_URL = "https://www.exchangerate-api.com";

/** Every rate is stored and expressed against this base. */
export const BASE_CURRENCY = "PEN";

export const CURRENCY_CODES = [
  "PEN",
  "COP",
  "USD",
  "EUR",
  "VES",
  "ARS",
  "BRL",
  "MXN",
  "CLP",
  "BOB",
] as const;

export type Currency = (typeof CURRENCY_CODES)[number];

export const CURRENCIES: Record<
  Currency,
  { name: string; locale: string; symbol: string; decimals: number }
> = {
  PEN: { name: "Sol peruano", locale: "es-PE", symbol: "S/", decimals: 2 },
  COP: { name: "Peso colombiano", locale: "es-CO", symbol: "$", decimals: 0 },
  USD: { name: "Dólar estadounidense", locale: "en-US", symbol: "US$", decimals: 2 },
  EUR: { name: "Euro", locale: "es-ES", symbol: "€", decimals: 2 },
  VES: { name: "Bolívar venezolano", locale: "es-VE", symbol: "Bs.", decimals: 2 },
  ARS: { name: "Peso argentino", locale: "es-AR", symbol: "$", decimals: 2 },
  BRL: { name: "Real brasileño", locale: "pt-BR", symbol: "R$", decimals: 2 },
  MXN: { name: "Peso mexicano", locale: "es-MX", symbol: "$", decimals: 2 },
  CLP: { name: "Peso chileno", locale: "es-CL", symbol: "$", decimals: 0 },
  BOB: { name: "Boliviano", locale: "es-BO", symbol: "Bs.", decimals: 2 },
};

/** Currency used in each origin country (Ecuador uses the US dollar). */
const COUNTRY_CURRENCY: Record<string, Currency> = {
  PE: "PEN",
  CO: "COP",
  AR: "ARS",
  BO: "BOB",
  BR: "BRL",
  CL: "CLP",
  EC: "USD",
  MX: "MXN",
  VE: "VES",
};

export function isCurrency(value: unknown): value is Currency {
  return CURRENCY_CODES.includes(value as Currency);
}

/** Currency of a country, or null when it is not supported (e.g. PY, UY). */
export function currencyForCountry(country: string): Currency | null {
  return COUNTRY_CURRENCY[country] ?? null;
}

/** Units of each currency per 1 PEN. PEN itself is always 1. */
export type RatesPerPen = Partial<Record<Currency, number>>;

export type ExchangeRates = {
  rates: RatesPerPen;
  /** ISO timestamp of when the rates were fetched. */
  fetchedAt: string;
  source: string;
  /** true when the API failed and these are older stored rates. */
  stale: boolean;
};

/** Converts any pair through PEN. Returns null if a rate is missing. */
export function convert(
  value: number,
  from: Currency,
  to: Currency,
  rates: RatesPerPen,
): number | null {
  const fromRate = from === BASE_CURRENCY ? 1 : rates[from];
  const toRate = to === BASE_CURRENCY ? 1 : rates[to];
  if (!fromRate || !toRate) return null;
  return (value / fromRate) * toRate;
}

/**
 * Number without symbol in the currency's locale: es-PE "1,234.5",
 * es-CO "1.234.568". Small values keep enough digits to stay meaningful.
 */
export function formatAmount(value: number, currency: Currency) {
  const { locale, decimals } = CURRENCIES[currency];
  const small = value !== 0 && Math.abs(value) < 1;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: small ? Math.max(decimals, 4) : decimals,
  }).format(value);
}

function usesDecimalComma(currency: Currency) {
  const parts = new Intl.NumberFormat(CURRENCIES[currency].locale).formatToParts(1.5);
  return parts.find((p) => p.type === "decimal")?.value === ",";
}

/**
 * Parses what the user typed, following the currency's locale separators
 * (es-PE "1,234.5" vs es-CO "1.234,5"). Also accepts short decimals typed
 * the other way ("2,50" for soles, "2.5" for euros).
 * Returns null for empty or invalid input.
 */
export function parseAmount(text: string, currency: Currency): number | null {
  let clean = text.replace(/[^\d.,]/g, "");
  const { decimals } = CURRENCIES[currency];
  if (usesDecimalComma(currency)) {
    if (decimals > 0 && !clean.includes(",") && /^\d+\.\d{1,2}$/.test(clean)) {
      // "2.5" typed with a decimal point: keep it as is.
    } else {
      clean = clean.replace(/\./g, "").replace(",", ".");
    }
  } else if (!clean.includes(".") && /^\d+,\d{1,2}$/.test(clean)) {
    clean = clean.replace(",", "."); // "2,50" typed with a decimal comma
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
