import type { Json, RoutePath, TransportMode, TransportRoute } from "@/types/database";

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  combi: "Combi",
  mototaxi: "Mototaxi",
  bus: "Bus",
  colectivo: "Colectivo",
  taxi: "Taxi",
};

/** Columns the Transporte screen needs. */
export const ROUTE_COLUMNS =
  "id, code, name, mode, origin_name, origin_lat, origin_lng, destination_name, destination_lat, destination_lng, path, fare_min, fare_max, schedule, tips, source_name, source_url, verified_at" as const;

export type RouteItem = Pick<
  TransportRoute,
  | "id"
  | "code"
  | "name"
  | "mode"
  | "origin_name"
  | "origin_lat"
  | "origin_lng"
  | "destination_name"
  | "destination_lat"
  | "destination_lng"
  | "path"
  | "fare_min"
  | "fare_max"
  | "schedule"
  | "tips"
  | "source_name"
  | "source_url"
  | "verified_at"
>;

function soles(value: number | string) {
  return Number(value).toFixed(2);
}

/** "S/ 1.50 – 2.00", "S/ 1.50" or "Tarifa por verificar". */
export function formatFare(min: number | null, max: number | null) {
  if (min === null && max === null) return "Tarifa por verificar";
  if (min === null || max === null || Number(min) === Number(max)) {
    return `S/ ${soles((min ?? max)!)}`;
  }
  return `S/ ${soles(min)} – ${soles(max)}`;
}

/** Validates transport_routes.path: at least two finite [lat, lng] pairs. */
export function parseRoutePath(path: Json | null): RoutePath | null {
  if (!Array.isArray(path)) return null;
  const points: RoutePath = [];
  for (const p of path) {
    if (
      !Array.isArray(p) ||
      p.length !== 2 ||
      typeof p[0] !== "number" ||
      typeof p[1] !== "number" ||
      !Number.isFinite(p[0]) ||
      !Number.isFinite(p[1])
    ) {
      return null;
    }
    points.push([p[0], p[1]]);
  }
  return points.length > 1 ? points : null;
}
