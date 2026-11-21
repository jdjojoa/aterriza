/**
 * Countries (ISO 3166-1 alpha-2) with their Spanish name, flag and currency
 * (ISO 4217). Names come from Intl.DisplayNames, so there is no hand-written
 * list to keep in sync. Peru is the destination, so it is not an origin
 * country: national students pick a department and a city instead.
 *
 * Intl output can differ slightly between Node and browser ICU versions: build
 * lists and labels on the server and pass them to Client Components as props.
 */

/** Currency used in each country. Territories use their sovereign's currency. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  AD: "EUR", AE: "AED", AF: "AFN", AG: "XCD", AI: "XCD", AL: "ALL", AM: "AMD",
  AO: "AOA", AR: "ARS", AS: "USD", AT: "EUR", AU: "AUD", AW: "AWG", AX: "EUR",
  AZ: "AZN", BA: "BAM", BB: "BBD", BD: "BDT", BE: "EUR", BF: "XOF", BG: "EUR",
  BH: "BHD", BI: "BIF", BJ: "XOF", BL: "EUR", BM: "BMD", BN: "BND", BO: "BOB",
  BQ: "USD", BR: "BRL", BS: "BSD", BT: "BTN", BW: "BWP", BY: "BYN", BZ: "BZD",
  CA: "CAD", CC: "AUD", CD: "CDF", CF: "XAF", CG: "XAF", CH: "CHF", CI: "XOF",
  CK: "NZD", CL: "CLP", CM: "XAF", CN: "CNY", CO: "COP", CR: "CRC", CU: "CUP",
  CV: "CVE", CW: "XCG", CX: "AUD", CY: "EUR", CZ: "CZK", DE: "EUR", DJ: "DJF",
  DK: "DKK", DM: "XCD", DO: "DOP", DZ: "DZD", EC: "USD", EE: "EUR", EG: "EGP",
  EH: "MAD", ER: "ERN", ES: "EUR", ET: "ETB", FI: "EUR", FJ: "FJD", FK: "FKP",
  FM: "USD", FO: "DKK", FR: "EUR", GA: "XAF", GB: "GBP", GD: "XCD", GE: "GEL",
  GF: "EUR", GG: "GBP", GH: "GHS", GI: "GIP", GL: "DKK", GM: "GMD", GN: "GNF",
  GP: "EUR", GQ: "XAF", GR: "EUR", GS: "GBP", GT: "GTQ", GU: "USD", GW: "XOF",
  GY: "GYD", HK: "HKD", HN: "HNL", HR: "EUR", HT: "HTG", HU: "HUF", ID: "IDR",
  IE: "EUR", IL: "ILS", IM: "GBP", IN: "INR", IO: "USD", IQ: "IQD", IR: "IRR",
  IS: "ISK", IT: "EUR", JE: "GBP", JM: "JMD", JO: "JOD", JP: "JPY", KE: "KES",
  KG: "KGS", KH: "KHR", KI: "AUD", KM: "KMF", KN: "XCD", KP: "KPW", KR: "KRW",
  KW: "KWD", KY: "KYD", KZ: "KZT", LA: "LAK", LB: "LBP", LC: "XCD", LI: "CHF",
  LK: "LKR", LR: "LRD", LS: "LSL", LT: "EUR", LU: "EUR", LV: "EUR", LY: "LYD",
  MA: "MAD", MC: "EUR", MD: "MDL", ME: "EUR", MF: "EUR", MG: "MGA", MH: "USD",
  MK: "MKD", ML: "XOF", MM: "MMK", MN: "MNT", MO: "MOP", MP: "USD", MQ: "EUR",
  MR: "MRU", MS: "XCD", MT: "EUR", MU: "MUR", MV: "MVR", MW: "MWK", MX: "MXN",
  MY: "MYR", MZ: "MZN", NA: "NAD", NC: "XPF", NE: "XOF", NF: "AUD", NG: "NGN",
  NI: "NIO", NL: "EUR", NO: "NOK", NP: "NPR", NR: "AUD", NU: "NZD", NZ: "NZD",
  OM: "OMR", PA: "PAB", PE: "PEN", PF: "XPF", PG: "PGK", PH: "PHP", PK: "PKR",
  PL: "PLN", PM: "EUR", PN: "NZD", PR: "USD", PS: "ILS", PT: "EUR", PW: "USD",
  PY: "PYG", QA: "QAR", RE: "EUR", RO: "RON", RS: "RSD", RU: "RUB", RW: "RWF",
  SA: "SAR", SB: "SBD", SC: "SCR", SD: "SDG", SE: "SEK", SG: "SGD", SH: "SHP",
  SI: "EUR", SJ: "NOK", SK: "EUR", SL: "SLE", SM: "EUR", SN: "XOF", SO: "SOS",
  SR: "SRD", SS: "SSP", ST: "STN", SV: "USD", SX: "XCG", SY: "SYP", SZ: "SZL",
  TC: "USD", TD: "XAF", TF: "EUR", TG: "XOF", TH: "THB", TJ: "TJS", TK: "NZD",
  TL: "USD", TM: "TMT", TN: "TND", TO: "TOP", TR: "TRY", TT: "TTD", TV: "AUD",
  TW: "TWD", TZ: "TZS", UA: "UAH", UG: "UGX", UM: "USD", US: "USD", UY: "UYU",
  UZ: "UZS", VA: "EUR", VC: "XCD", VE: "VES", VG: "USD", VI: "USD", VN: "VND",
  VU: "VUV", WF: "XPF", WS: "WST", XK: "EUR", YE: "YER", YT: "EUR", ZA: "ZAR",
  ZM: "ZMW", ZW: "ZWG",
};

/** Destination country and city: fixed to Piura for now. */
export const DESTINATION = { country: "PE", city: "Piura" } as const;

/** Every country a student can come from (all of the map except Peru). */
export const ORIGIN_COUNTRY_CODES = Object.keys(COUNTRY_CURRENCY).filter(
  (code) => code !== DESTINATION.country,
);

export type CountryOption = { code: string; name: string; flag: string };

const regionNames = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });

/** "PY" -> "Paraguay". Unknown codes come back as the code itself. */
export function countryName(code: string | null | undefined) {
  if (!code) return "tu país";
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** "PY" -> "🇵🇾" (regional indicator symbols). */
export function countryFlag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function isOriginCountry(value: unknown): value is string {
  return typeof value === "string" && ORIGIN_COUNTRY_CODES.includes(value);
}

/** Every origin country, sorted by its Spanish name. Build it on the server. */
export function originCountryOptions(): CountryOption[] {
  return ORIGIN_COUNTRY_CODES.map((code) => ({
    code,
    name: countryName(code),
    flag: countryFlag(code),
  })).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** ISO 4217 currency of a country, or null when it is unknown. */
export function currencyForCountry(country: string | null | undefined): string | null {
  return (country && COUNTRY_CURRENCY[country.toUpperCase()]) || null;
}
