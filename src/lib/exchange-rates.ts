import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BASE_CURRENCY,
  CURRENCY_CODES,
  RATE_SOURCE,
  isCurrency,
  type ExchangeRates,
  type RatesPerPen,
} from "@/lib/currency";

const API_URL = "https://open.er-api.com/v6/latest/PEN";
const API_TIMEOUT_MS = 5000;
/** Enough rows to read back one full daily batch. */
const BATCH_READ_LIMIT = CURRENCY_CODES.length * 2;

/** Calendar date (YYYY-MM-DD) of an instant in Piura's time zone. */
function limaDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

/**
 * Fetches PEN-based rates and keeps only our currencies. Currencies missing
 * from the response are simply left out (the UI hides them).
 */
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

  const rates: RatesPerPen = {};
  for (const code of CURRENCY_CODES) {
    if (code === BASE_CURRENCY) continue;
    const rate = body.rates[code];
    if (typeof rate === "number" && rate > 0) rates[code] = rate;
    else console.warn(`exchange rates: ${code} missing from API response`);
  }
  if (Object.keys(rates).length === 0) {
    throw new Error("ExchangeRate-API returned none of our currencies");
  }
  return rates;
}

type StoredBatch = { rates: RatesPerPen; fetchedAt: string; source: string };

/** Latest stored batch: all PEN rows sharing the newest fetched_at. */
async function readLatestBatch(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<StoredBatch | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("quote, rate, fetched_at, source")
    .eq("base", BASE_CURRENCY)
    .order("fetched_at", { ascending: false })
    .limit(BATCH_READ_LIMIT);
  if (error) console.error("exchange rates: read failed", error.message);
  if (!data || data.length === 0) return null;

  const { fetched_at: fetchedAt, source } = data[0];
  const rates: RatesPerPen = {};
  for (const row of data) {
    if (row.fetched_at !== fetchedAt) break;
    if (isCurrency(row.quote) && row.quote !== BASE_CURRENCY) {
      rates[row.quote] = Number(row.rate);
    }
  }
  return { rates, fetchedAt, source };
}

/**
 * Today's PEN-based rates (America/Lima). The first request of the day makes
 * one API call and stores every rate in a single insert; later requests read
 * that batch. If the API fails, falls back to the latest stored batch
 * (stale = true). Returns null only when there are no rates at all.
 */
export async function getExchangeRates(): Promise<ExchangeRates | null> {
  const supabase = createAdminClient();
  const latest = await readLatestBatch(supabase);

  const now = new Date();
  // Older versions stored only PEN→COP; a single-row batch is refreshed.
  const latestIsFullBatch = latest && Object.keys(latest.rates).length > 1;
  if (latest && latestIsFullBatch && limaDate(latest.fetchedAt) === limaDate(now)) {
    return { ...latest, stale: false };
  }

  try {
    const rates = await fetchFromApi();
    const fetchedAt = now.toISOString();
    const rows = Object.entries(rates).map(([quote, rate]) => ({
      base: BASE_CURRENCY,
      quote,
      rate,
      fetched_at: fetchedAt,
      source: RATE_SOURCE,
    }));
    const { error: insertError } = await supabase.from("exchange_rates").insert(rows);
    if (insertError) console.error("exchange rates: insert failed", insertError.message);
    return { rates, fetchedAt, source: RATE_SOURCE, stale: false };
  } catch (error) {
    console.error("exchange rates: API failed", error instanceof Error ? error.message : error);
    return latest ? { ...latest, stale: true } : null;
  }
}
