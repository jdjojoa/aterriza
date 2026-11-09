/**
 * Google Maps links built from coordinates. Uses the public "Maps URLs"
 * format, which needs no API key:
 * https://developers.google.com/maps/documentation/urls/get-started
 */

export type LatLng = { lat: number; lng: number };

/** Piura city centre. Default map centre. */
export const PIURA_CENTER: LatLng = { lat: -5.1945, lng: -80.6328 };

const BASE = "https://www.google.com/maps";

function point({ lat, lng }: LatLng) {
  return `${lat},${lng}`;
}

/** Opens Google Maps on a point (or on a text query when there are no coordinates). */
export function googleMapsSearchUrl(target: LatLng | string) {
  const query = typeof target === "string" ? target : point(target);
  return `${BASE}/search/?${new URLSearchParams({ api: "1", query })}`;
}

export type TravelMode = "driving" | "walking" | "bicycling" | "transit";

/** Opens Google Maps with directions from `origin` to `destination`. */
export function googleMapsDirectionsUrl(
  origin: LatLng,
  destination: LatLng,
  travelMode: TravelMode = "transit",
) {
  const params = new URLSearchParams({
    api: "1",
    origin: point(origin),
    destination: point(destination),
    travelmode: travelMode,
  });
  return `${BASE}/dir/?${params}`;
}

/** Builds a LatLng only when both values are finite numbers. */
export function toLatLng(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): LatLng | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) ? { lat: la, lng: ln } : null;
}
