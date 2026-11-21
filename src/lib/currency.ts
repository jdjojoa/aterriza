/**
 * Shared (client-safe) currency helpers for the converter. Any ISO 4217 code
 * the rates API returns is supported; names, symbols and decimals come from
 * Intl. Build CurrencyInfo on the server (currencyInfos) and pass it to Client
 * Components, so server and browser render the same text.
 */
import { COUNTRY_CURRENCY } from "@/lib/countries";

export const RATE_SOURCE = "ExchangeRate-API";
export const RATE_ATTRIBUTION = "Rates By Exchange Rate API";
export const RATE_ATTRIBUTION_URL = "https://www.exchangerate-api.com";

/** Every rate is stored and expressed against this base. */
export const BASE_CURRENCY = "PEN";
/** Shown when the user's currency has no rate yet. */
export const FALLBACK_CURRENCY = "USD";

/** ISO 4217 code ("PEN", "PYG", …). */
export type Currency = string;

export type CurrencyInfo = {
  code: Currency;
  /** "Guaraní paraguayo" */
  name: string;
  /** Locale whose separators the amounts use ("es-PY"). */
  locale: string;
  /** "₲", "S/", "US$"… */
  symbol: string;
  decimals: number;
};

/** Locales for currencies shared by many countries or with a well-known home. */
const CURRENCY_LOCALE: Record<string, string> = {
  PEN: "es-PE",
  USD: "en-US",
  EUR: "es-ES",
  XOF: "fr-SN",
  XAF: "fr-CM",
  XCD: "en-AG",
  XPF: "fr-PF",
};

/** Symbols that read better than Intl's narrow symbol in a Peruvian context. */
const SYMBOL_OVERRIDES: Record<string, string> = { USD: "US$", PEN: "S/" };

/** Peso colombiano: Intl says 2 decimals, but cents are not used in practice. */
const DECIMAL_OVERRIDES: Record<string, number> = { COP: 0 };

export function isCurrencyCode(value: unknown): value is Currency {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

function localeFor(code: Currency) {
  if (CURRENCY_LOCALE[code]) return CURRENCY_LOCALE[code];
  const country = Object.keys(COUNTRY_CURRENCY).find((c) => COUNTRY_CURRENCY[c] === code);
  return country ? `es-${country}` : "es-419";
}

const currencyNames = new Intl.DisplayNames(["es"], { type: "currency", fallback: "code" });

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

/** Name, symbol and decimals of a currency, from Intl. */
export function currencyInfo(code: Currency): CurrencyInfo {
  const locale = localeFor(code);
  let symbol = code;
  let decimals = 2;
  let name = code;
  try {
    const format = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    });
    decimals = format.resolvedOptions().maximumFractionDigits ?? 2;
    symbol = format.formatToParts(1).find((p) => p.type === "currency")?.value ?? code;
    name = capitalize(currencyNames.of(code) ?? code);
  } catch {
    // Unknown code for this ICU: keep the code as name and symbol.
  }
  return {
    code,
    name,
    locale,
    symbol: SYMBOL_OVERRIDES[code] ?? symbol,
    decimals: DECIMAL_OVERRIDES[code] ?? decimals,
  };
}

export function currencyInfos(codes: Currency[]): Record<Currency, CurrencyInfo> {
  return Object.fromEntries(codes.map((code) => [code, currencyInfo(code)]));
}

/** Units of each currency per 1 PEN. PEN itself is always 1. */
export type RatesPerPen = Record<Currency, number>;

export type ExchangeRates = {
  rates: RatesPerPen;
  /** ISO timestamp of when the rates were fetched. */
  fetchedAt: string;
  source: string;
  /** true when the API failed and these are older stored rates. */
  stale: boolean;
};

export function hasRate(rates: RatesPerPen, code: Currency) {
  return code === BASE_CURRENCY || (typeof rates[code] === "number" && rates[code] > 0);
}

/**
 * Currency to show next to PEN for a user's currency: their own when the API
 * has it, otherwise USD. `missing` is the user's currency when it had no rate.
 */
export function quoteCurrencyFor(
  userCurrency: Currency | null,
  rates: RatesPerPen,
): { quote: Currency; missing: Currency | null } {
  if (userCurrency && userCurrency !== BASE_CURRENCY && hasRate(rates, userCurrency)) {
    return { quote: userCurrency, missing: null };
  }
  const missing = userCurrency && userCurrency !== BASE_CURRENCY ? userCurrency : null;
  return { quote: FALLBACK_CURRENCY, missing };
}

/** "Mostramos dólares porque aún no tenemos tasa para {moneda}". */
export function missingRateNotice(missing: CurrencyInfo) {
  return `Mostramos dólares porque aún no tenemos tasa para ${missing.name} (${missing.code}).`;
}

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
export function formatAmount(value: number, currency: CurrencyInfo) {
  const { locale, decimals } = currency;
  const small = value !== 0 && Math.abs(value) < 1;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: small ? Math.max(decimals, 4) : decimals,
  }).format(value);
}

function usesDecimalComma(currency: CurrencyInfo) {
  const parts = new Intl.NumberFormat(currency.locale).formatToParts(1.5);
  return parts.find((p) => p.type === "decimal")?.value === ",";
}

/**
 * Parses what the user typed, following the currency's locale separators
 * (es-PE "1,234.5" vs es-CO "1.234,5"). Also accepts short decimals typed
 * the other way ("2,50" for soles, "2.5" for euros).
 * Returns null for empty or invalid input.
 */
export function parseAmount(text: string, currency: CurrencyInfo): number | null {
  let clean = text.replace(/[^\d.,]/g, "");
  const { decimals } = currency;
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
