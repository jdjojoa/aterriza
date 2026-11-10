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

/**
 * Opens Google Maps on a point or a text query:
 * https://www.google.com/maps/search/?api=1&query=LAT,LNG (latitude first).
 */
export function googleMapsSearchUrl(target: LatLng | string) {
  const query = typeof target === "string" ? target : point(target);
  return `${BASE}/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * "Malecón Eguiguren" + "Malecón Eguiguren, Piura" -> "Malecón Eguiguren, Piura".
 * Joins name, address parts and "Piura", skipping parts already mentioned.
 */
export function placeQuery(name: string | null, address: string | null) {
  const parts: string[] = [];
  for (const raw of [name, ...(address ?? "").split(","), "Piura"]) {
    const part = raw?.trim();
    if (!part) continue;
    const lower = part.toLowerCase();
    if (parts.some((p) => p.toLowerCase().includes(lower))) continue;
    parts.push(part);
  }
  return parts.join(", ");
}

/**
 * Google Maps link for a place. A text query with the name lands on Google's
 * own place card (right pin, photos, opening hours), while our coordinates are
 * hand-entered and may be off by a few blocks, so the name wins. Coordinates
 * are the fallback for places without a name.
 */
export function googleMapsPlaceUrl(place: {
  name: string | null;
  address: string | null;
  lat: number | string | null;
  lng: number | string | null;
}) {
  if (place.name?.trim()) return googleMapsSearchUrl(placeQuery(place.name, place.address));
  const coords = toLatLng(place.lat, place.lng);
  return coords ? googleMapsSearchUrl(coords) : googleMapsSearchUrl(placeQuery(null, place.address));
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
