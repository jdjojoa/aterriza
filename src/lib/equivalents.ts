/**
 * Country-specific equivalents of medicines, dishes and slang (0016).
 * Types are client-safe; the loader takes the caller's Supabase client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { countryName } from "@/lib/countries";
import type { Database, EquivalentContentType } from "@/types/database";

export type EquivalentInfo = {
  text: string;
  brandNames: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
};

/**
 * What a card shows about the user's country:
 * - null: national student → no equivalent section at all;
 * - { equivalent: null }: no row for that country → "Aún no tenemos…" + "Sugerir una";
 * - { equivalent }: "Equivalente en {país}" / "Parecido en {país}" / "En {país} se dice…".
 */
export type CountryEquivalent = {
  countryCode: string;
  countryName: string;
  equivalent: EquivalentInfo | null;
} | null;

/** Suggestion target for "Sugerir una" (creates a community tip). */
export const SUGGESTION_TIP_CATEGORY = "equivalencia";

export const CONTENT_TYPE_LABELS: Record<EquivalentContentType, string> = {
  medicine: "medicamento",
  food: "plato",
  slang: "palabra",
};

/** Equivalents of one content type for one country, keyed by content id. */
export async function loadEquivalents(
  supabase: SupabaseClient<Database>,
  contentType: EquivalentContentType,
  countryCode: string | null,
  contentIds?: string[],
): Promise<Map<string, EquivalentInfo>> {
  const result = new Map<string, EquivalentInfo>();
  if (!countryCode) return result;
  let query = supabase
    .from("equivalents")
    .select("content_id, equivalent_text, brand_names, source_name, source_url, verified_at")
    .eq("content_type", contentType)
    .eq("country_code", countryCode);
  if (contentIds) {
    if (contentIds.length === 0) return result;
    query = query.in("content_id", contentIds.slice(0, 200));
  }
  const { data, error } = await query.limit(1000);
  if (error) {
    console.error("[equivalents] load failed", error.message);
    return result;
  }
  for (const row of data ?? []) {
    result.set(row.content_id, {
      text: row.equivalent_text,
      brandNames: row.brand_names ?? [],
      sourceName: row.source_name,
      sourceUrl: row.source_url,
      verifiedAt: row.verified_at,
    });
  }
  return result;
}

/** CountryEquivalent for a card (server side: uses Intl country names). */
export function countryEquivalent(
  countryCode: string | null,
  equivalent: EquivalentInfo | undefined | null,
): CountryEquivalent {
  if (!countryCode) return null;
  return { countryCode, countryName: countryName(countryCode), equivalent: equivalent ?? null };
}
