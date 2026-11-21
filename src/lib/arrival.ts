/** "Cómo llegar a Piura" (arrival_routes) helpers, client and server safe. */
import type { ArrivalMode, ArrivalRoute } from "@/types/database";

export const ARRIVAL_MODE_LABELS: Record<ArrivalMode, string> = {
  bus: "Bus",
  avion: "Avión",
  colectivo: "Colectivo",
};

export const ARRIVAL_COLUMNS =
  "id, origin_city, origin_department, transport_mode, terminal_origen, terminal_llegada, duracion_aprox, precio_min, precio_max, empresas, notas, source_name, source_url, verified_at" as const;

export type ArrivalItem = Pick<
  ArrivalRoute,
  | "id"
  | "origin_city"
  | "origin_department"
  | "transport_mode"
  | "terminal_origen"
  | "terminal_llegada"
  | "duracion_aprox"
  | "precio_min"
  | "precio_max"
  | "empresas"
  | "notas"
  | "source_name"
  | "source_url"
  | "verified_at"
>;

function soles(value: number | string) {
  return Number(value).toFixed(2);
}

export const NO_PRICE_TEXT = "Consulta el precio con la empresa";

/** Shown on every unverified arrival route. */
export const ARRIVAL_REFERENCE_LABEL = "Referencial — confirma antes de viajar";

/** "S/ 60.00 – 120.00", "S/ 80.00" or "Consulta el precio con la empresa". */
export function formatPriceRange(min: number | null, max: number | null) {
  if (min === null && max === null) return NO_PRICE_TEXT;
  if (min === null || max === null || Number(min) === Number(max)) return `S/ ${soles((min ?? max)!)}`;
  return `S/ ${soles(min)} – ${soles(max)}`;
}
