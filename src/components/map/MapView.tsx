"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { PIURA_CENTER, type LatLng } from "@/lib/maps";

export type MarkerTone = "accent" | "primary";

export type MapMarker = LatLng & {
  id: string;
  /** Accessible name and tooltip. */
  title: string;
  tone?: MarkerTone;
  /** Bigger pin for the selected item. */
  emphasized?: boolean;
};

export type MapViewProps = {
  markers?: MapMarker[];
  /** Polyline drawn on top of the tiles, as [lat, lng] points. */
  line?: [number, number][] | null;
  /** Extra class for the line, e.g. "map-route--combi" for the mode colour. */
  lineClassName?: string;
  /** Dashed line: approximate (straight) geometry. */
  lineDashed?: boolean;
  /** Adds the OSRM credit next to OpenStreetMap's. */
  routing?: boolean;
  /** When set, the map zooms to fit these points (or centres on a single one). */
  focus?: LatLng[] | null;
  onMarkerClick?: (id: string) => void;
  zoom?: number;
  className?: string;
};

export const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/** For maps that draw route geometry computed with OSRM. */
export const ROUTING_ATTRIBUTION = `${OSM_ATTRIBUTION} · Recorridos: <a href="https://project-osrm.org/">OSRM</a>`;

const iconCache = new Map<string, L.DivIcon>();

/** Custom SVG pin; colours come from CSS tokens (see globals.css). */
export function pinIcon(tone: MarkerTone, emphasized: boolean) {
  const key = `${tone}-${emphasized}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const width = emphasized ? 40 : 30;
  const height = Math.round(width * 1.3);
  const icon = L.divIcon({
    className: `map-pin map-pin--${tone}`,
    html: `<svg viewBox="0 0 30 39" width="${width}" height="${height}" aria-hidden="true"><path class="map-pin__body" d="M15 1.5C7.5 1.5 1.5 7.4 1.5 14.8 1.5 25 15 37.5 15 37.5S28.5 25 28.5 14.8C28.5 7.4 22.5 1.5 15 1.5Z"/><circle class="map-pin__dot" cx="15" cy="14.5" r="5"/></svg>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
  });
  iconCache.set(key, icon);
  return icon;
}

function FitToFocus({ focus, zoom }: { focus: LatLng[]; zoom: number }) {
  const map = useMap();
  const key = focus.map((p) => `${p.lat},${p.lng}`).join("|");

  useEffect(() => {
    if (focus.length === 0) return;
    if (focus.length === 1) {
      map.flyTo([focus[0].lat, focus[0].lng], Math.max(map.getZoom(), 16), {
        duration: 0.5,
      });
      return;
    }
    map.fitBounds(
      L.latLngBounds(focus.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [32, 32], maxZoom: zoom + 4 },
    );
    // `key` captures the content of `focus`; the array identity may change every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, zoom]);

  return null;
}

/**
 * Leaflet map with OpenStreetMap tiles, centred on Piura.
 * Browser-only: load it through `DynamicMapView` (next/dynamic, ssr: false).
 */
export default function MapView({
  markers = [],
  line = null,
  lineClassName = "",
  lineDashed = false,
  routing = false,
  focus = null,
  onMarkerClick,
  zoom = 13,
  className = "",
}: MapViewProps) {
  const center = useMemo<[number, number]>(
    () => [PIURA_CENTER.lat, PIURA_CENTER.lng],
    [],
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      className={`aterriza-map isolate h-full w-full ${className}`.trim()}
    >
      <TileLayer url={OSM_TILES} attribution={routing ? ROUTING_ATTRIBUTION : OSM_ATTRIBUTION} maxZoom={19} />
      {line && line.length > 1 && (
        // key: Leaflet applies className only on creation.
        <Polyline
          key={`${lineClassName}-${lineDashed}`}
          positions={line}
          pathOptions={{
            className: `map-route ${lineClassName}`.trim(),
            weight: 5,
            opacity: 0.9,
            dashArray: lineDashed ? "8 8" : undefined,
          }}
        />
      )}
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={pinIcon(m.tone ?? "accent", Boolean(m.emphasized))}
          title={m.title}
          alt={m.title}
          zIndexOffset={m.emphasized ? 1000 : 0}
          eventHandlers={
            onMarkerClick ? { click: () => onMarkerClick(m.id) } : undefined
          }
        />
      ))}
      {focus && <FitToFocus focus={focus} zoom={zoom} />}
    </MapContainer>
  );
}
