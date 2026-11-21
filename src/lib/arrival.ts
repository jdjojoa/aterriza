/** "Cómo llegar a Piura" (arrival_routes) helpers, client and server safe. */
import type { ArrivalMode, ArrivalRoute } from "@/types/database";

export const ARRIVAL_MODE_LABELS: Record<ArrivalMode, string> = {
  bus: "Bus",
  avion: "Avión",
  colectivo: "Colectivo",
};

export const ARRIVAL_COLUMNS =
  "id, origin_city, transport_mode, terminal_origen, terminal_llegada, duracion_aprox, precio_min, precio_max, empresas, notas, source_name, source_url, verified_at" as const;

export type ArrivalItem = Pick<
  ArrivalRoute,
  | "id"
  | "origin_city"
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

/** "S/ 60.00 – 120.00", "S/ 80.00" or "Precio por verificar". */
export function formatPriceRange(min: number | null, max: number | null) {
  if (min === null && max === null) return "Precio por verificar";
  if (min === null || max === null || Number(min) === Number(max)) return `S/ ${soles((min ?? max)!)}`;
  return `S/ ${soles(min)} – ${soles(max)}`;
}
