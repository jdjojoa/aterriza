/** Origin countries offered in onboarding and profile (ISO 3166-1 alpha-2). */
export const ORIGIN_COUNTRIES = [
  { code: "CO", name: "Colombia" },
  { code: "AR", name: "Argentina" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brasil" },
  { code: "CL", name: "Chile" },
  { code: "EC", name: "Ecuador" },
  { code: "MX", name: "México" },
  { code: "PY", name: "Paraguay" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
] as const;

export type OriginCountryCode = (typeof ORIGIN_COUNTRIES)[number]["code"];

export const DEFAULT_ORIGIN_COUNTRY: OriginCountryCode = "CO";

const NAMES: Record<string, string> = {
  ...Object.fromEntries(ORIGIN_COUNTRIES.map((c) => [c.code, c.name])),
  PE: "Perú",
};

export function isOriginCountry(value: unknown): value is OriginCountryCode {
  return ORIGIN_COUNTRIES.some((c) => c.code === value);
}

export function countryName(code: string) {
  return NAMES[code] ?? code;
}

/** Destinations: fixed to Piura for now. */
export const DESTINATION = { country: "PE", city: "Piura" } as const;
