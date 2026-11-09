import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { RATE_SOURCE, type PenCopRate } from "@/lib/currency";

const BASE = "PEN";
const QUOTE = "COP";
const API_URL = "https://open.er-api.com/v6/latest/PEN";
const API_TIMEOUT_MS = 5000;

/** Calendar date (YYYY-MM-DD) of an instant in Piura's time zone. */
function limaDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

async function fetchFromApi(): Promise<number> {
  const res = await fetch(API_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ExchangeRate-API responded ${res.status}`);
  const body = (await res.json()) as { result?: string; rates?: Record<string, unknown> };
  const rate = body.rates?.[QUOTE];
  if (body.result !== "success" || typeof rate !== "number" || !(rate > 0)) {
    throw new Error("ExchangeRate-API returned no valid COP rate");
  }
  return rate;
}

/**
 * Today's PEN→COP rate (America/Lima). Fetches and stores a new one once per
 * day; if the API fails, falls back to the latest stored rate (stale = true).
 * Returns null only when there is no rate at all.
 */
export async function getPenCopRate(): Promise<PenCopRate | null> {
  const supabase = createAdminClient();

  const { data: latest, error: readError } = await supabase
    .from("exchange_rates")
    .select("rate, fetched_at, source")
    .eq("base", BASE)
    .eq("quote", QUOTE)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) console.error("exchange rates: read failed", readError.message);

  const now = new Date();
  if (latest && limaDate(latest.fetched_at) === limaDate(now)) {
    return {
      rate: Number(latest.rate),
      fetchedAt: latest.fetched_at,
      source: latest.source,
      stale: false,
    };
  }

  try {
    const rate = await fetchFromApi();
    const fetchedAt = now.toISOString();
    const { error: insertError } = await supabase
      .from("exchange_rates")
      .insert({ base: BASE, quote: QUOTE, rate, fetched_at: fetchedAt, source: RATE_SOURCE });
    if (insertError) console.error("exchange rates: insert failed", insertError.message);
    return { rate, fetchedAt, source: RATE_SOURCE, stale: false };
  } catch (error) {
    console.error("exchange rates: API failed", error instanceof Error ? error.message : error);
    if (!latest) return null;
    return {
      rate: Number(latest.rate),
      fetchedAt: latest.fetched_at,
      source: latest.source,
      stale: true,
    };
  }
}
