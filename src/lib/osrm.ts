/**
 * Street geometry for transport routes from the public OSRM demo server.
 *
 * SERVER ONLY: called from admin Server Actions and from
 * scripts/recalculate-route-paths.ts, never from the user's browser.
 * The demo server's usage policy asks for an identifying User-Agent and at
 * most 1 request per second, so every call goes through `throttle()`.
 * https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
 *
 * No Next.js imports here so the script can load it with tsx.
 */
import type { RoutePath, RoutePathSource } from "../types/database";
import { MAX_WAYPOINTS } from "./transport";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const MIN_INTERVAL_MS = 1100; // > 1 s between requests, with a small margin.
const TIMEOUT_MS = 10_000;

function userAgent() {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return `Aterriza/1.0 (route geometry for a student guide to Piura${site ? `; +${site}` : ""})`;
}

// One shared queue per server process: requests start at least 1.1 s apart.
let queue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function throttle(): Promise<void> {
  const turn = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
  });
  queue = turn.catch(() => {});
  return turn;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Asks OSRM for the driving route through `points` ([lat, lng], in order).
 * Returns [lat, lng] points for Leaflet, or throws with a short reason.
 */
export async function fetchOsrmPath(points: RoutePath): Promise<RoutePath> {
  if (points.length < 2) throw new Error("need at least 2 points");
  if (points.length > MAX_WAYPOINTS + 2) throw new Error("too many points");

  // OSRM wants lng,lat pairs separated by ";".
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;

  await throttle();
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

  const body = (await res.json()) as {
    code?: string;
    routes?: { geometry?: { type?: string; coordinates?: unknown } }[];
  };
  if (body.code !== "Ok") throw new Error(`OSRM ${body.code ?? "error"}`);

  const coordinates = body.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates)) throw new Error("OSRM returned no geometry");

  const path: RoutePath = [];
  for (const c of coordinates) {
    if (!Array.isArray(c) || typeof c[0] !== "number" || typeof c[1] !== "number") {
      throw new Error("OSRM returned invalid coordinates");
    }
    path.push([round(c[1]), round(c[0])]);
  }
  if (path.length < 2) throw new Error("OSRM returned a too short route");
  return path;
}

export type RouteGeometry = {
  path: RoutePath;
  source: RoutePathSource;
  /** Why OSRM failed, when source is "straight". */
  error?: string;
};

/**
 * Street geometry for origin → waypoints → destination. If OSRM fails, falls
 * back to straight segments between the same points.
 */
export async function computeRouteGeometry(points: RoutePath): Promise<RouteGeometry> {
  try {
    return { path: await fetchOsrmPath(points), source: "osrm" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { path: points, source: "straight", error: reason };
  }
}

/** Validates transport_routes.waypoints: finite [lat, lng] pairs. */
export function parseWaypoints(value: unknown): RoutePath {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (p): p is [number, number] =>
      Array.isArray(p) &&
      p.length === 2 &&
      typeof p[0] === "number" &&
      typeof p[1] === "number" &&
      Number.isFinite(p[0]) &&
      Number.isFinite(p[1]),
  );
}

type RoutePoints = {
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  waypoints: unknown;
};

/** origin → waypoints → destination, or null when origin or destination is missing. */
export function routeControlPoints(row: RoutePoints): RoutePath | null {
  const { origin_lat, origin_lng, destination_lat, destination_lng } = row;
  if (origin_lat === null || origin_lng === null || destination_lat === null || destination_lng === null) {
    return null;
  }
  return [
    [Number(origin_lat), Number(origin_lng)],
    ...parseWaypoints(row.waypoints),
    [Number(destination_lat), Number(destination_lng)],
  ];
}
