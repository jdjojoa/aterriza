/**
 * Where a student comes from: another country ("internacional") or another
 * city of Peru ("nacional"). Server-side helpers (they use Intl country names).
 */
import { countryName, currencyForCountry, DESTINATION } from "@/lib/countries";
import type { OriginType, Profile } from "@/types/database";

export type UserOrigin =
  | { type: "internacional"; country: string | null }
  | { type: "nacional"; department: string; city: string };

type OriginFields = Pick<Profile, "origin_type" | "origin_country" | "origin_department" | "origin_city">;

export function profileOrigin(profile: OriginFields): UserOrigin {
  if (profile.origin_type === "nacional" && profile.origin_city && profile.origin_department) {
    return { type: "nacional", department: profile.origin_department, city: profile.origin_city };
  }
  const country = profile.origin_country && profile.origin_country !== DESTINATION.country
    ? profile.origin_country
    : null;
  return { type: "internacional", country };
}

export function isOriginType(value: unknown): value is OriginType {
  return value === "internacional" || value === "nacional";
}

/** "Talara" or "Paraguay": the left side of "{origen} → Piura". */
export function originLabel(origin: UserOrigin) {
  return origin.type === "nacional" ? origin.city : countryName(origin.country);
}

/**
 * Country whose equivalents (medicines, food, slang) the user sees, or null
 * for national students, who need no foreign equivalents.
 */
export function equivalentCountry(origin: UserOrigin): string | null {
  return origin.type === "internacional" ? origin.country : null;
}

/** ISO 4217 currency of the user's country; null for national students. */
export function originCurrency(origin: UserOrigin): string | null {
  return origin.type === "internacional" ? currencyForCountry(origin.country) : null;
}
