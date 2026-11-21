import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BASE_CURRENCY,
  RATE_SOURCE,
  isCurrencyCode,
  type ExchangeRates,
  type RatesPerPen,
} from "@/lib/currency";

const API_URL = "https://open.er-api.com/v6/latest/PEN";
const API_TIMEOUT_MS = 5000;
/** Rows to read back one batch of the legacy table (fallback only). */
const LEGACY_READ_LIMIT = 40;

type Supabase = ReturnType<typeof createAdminClient>;

/** Calendar date (YYYY-MM-DD) of an instant in Piura's time zone. */
function limaDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

/** Keeps valid positive rates with ISO codes; drops PEN itself. */
function cleanRates(raw: unknown): RatesPerPen {
  const rates: RatesPerPen = {};
  if (!raw || typeof raw !== "object") return rates;
  for (const [code, rate] of Object.entries(raw as Record<string, unknown>)) {
    if (code === BASE_CURRENCY || !isCurrencyCode(code)) continue;
    const value = typeof rate === "number" ? rate : Number(rate);
    if (Number.isFinite(value) && value > 0) rates[code] = value;
  }
  return rates;
}

/** Fetches PEN-based rates for every currency the API has. */
async function fetchFromApi(): Promise<RatesPerPen> {
  const res = await fetch(API_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ExchangeRate-API responded ${res.status}`);
  const body = (await res.json()) as { result?: string; rates?: Record<string, unknown> };
  if (body.result !== "success" || !body.rates) {
    throw new Error("ExchangeRate-API returned no rates");
  }
  const rates = cleanRates(body.rates);
  if (Object.keys(rates).length === 0) throw new Error("ExchangeRate-API returned no usable rates");
  return rates;
}

type StoredBatch = { rates: RatesPerPen; fetchedAt: string; source: string };

/** Latest snapshot with every currency (0016). */
async function readLatestSnapshot(supabase: Supabase): Promise<StoredBatch | null> {
  const { data, error } = await supabase
    .from("exchange_rate_snapshots")
    .select("rates, fetched_at, source")
    .eq("base", BASE_CURRENCY)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("exchange rates: snapshot read failed", error.message);
  if (!data) return null;
  return { rates: cleanRates(data.rates), fetchedAt: data.fetched_at, source: data.source };
}

/** Older per-row table (a few currencies). Only a fallback when nothing else works. */
async function readLegacyBatch(supabase: Supabase): Promise<StoredBatch | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("quote, rate, fetched_at, source")
    .eq("base", BASE_CURRENCY)
    .order("fetched_at", { ascending: false })
    .limit(LEGACY_READ_LIMIT);
  if (error) console.error("exchange rates: legacy read failed", error.message);
  if (!data || data.length === 0) return null;
  const { fetched_at: fetchedAt, source } = data[0];
  const raw: Record<string, number> = {};
  for (const row of data) {
    if (row.fetched_at !== fetchedAt) break;
    raw[row.quote] = Number(row.rate);
  }
  return { rates: cleanRates(raw), fetchedAt, source };
}

/**
 * Today's PEN-based rates (America/Lima). The first request of the day makes
 * one API call and stores one snapshot; later requests read it. If the API
 * fails, falls back to the latest stored rates (stale = true). Returns null
 * only when there are no rates at all.
 */
export async function getExchangeRates(): Promise<ExchangeRates | null> {
  const supabase = createAdminClient();
  const latest = await readLatestSnapshot(supabase);

  const now = new Date();
  if (latest && Object.keys(latest.rates).length > 0 && limaDate(latest.fetchedAt) === limaDate(now)) {
    return { ...latest, stale: false };
  }

  try {
    const rates = await fetchFromApi();
    const fetchedAt = now.toISOString();
    const { error: insertError } = await supabase.from("exchange_rate_snapshots").insert({
      base: BASE_CURRENCY,
      rates,
      fetched_at: fetchedAt,
      source: RATE_SOURCE,
    });
    if (insertError) console.error("exchange rates: insert failed", insertError.message);
    return { rates, fetchedAt, source: RATE_SOURCE, stale: false };
  } catch (error) {
    console.error("exchange rates: API failed", error instanceof Error ? error.message : error);
    const stored = latest ?? (await readLegacyBatch(supabase));
    return stored ? { ...stored, stale: true } : null;
  }
}
