"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import { PIURA_CENTER, type LatLng } from "@/lib/maps";
import { OSM_ATTRIBUTION, OSM_TILES, ROUTING_ATTRIBUTION, pinIcon, type MarkerTone } from "./MapView";

export type PickerPoint = LatLng & { key: string; title: string; tone: MarkerTone };

export type PickerMapProps = {
  points: PickerPoint[];
  /** Numbered intermediate points of a route. */
  waypoints?: [number, number][];
  line?: [number, number][];
  /** "route": street geometry; "draft": dashed preview through the points. */
  lineStyle?: "route" | "draft";
  /** Adds the OSRM credit next to OpenStreetMap's. */
  routing?: boolean;
  onPick: (point: LatLng) => void;
  className?: string;
};

const waypointIcons = new Map<number, L.DivIcon>();

function waypointIcon(n: number) {
  let icon = waypointIcons.get(n);
  if (!icon) {
    icon = L.divIcon({
      className: "map-waypoint",
      html: `<span>${n}</span>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    waypointIcons.set(n, icon);
  }
  return icon;
}

function ClickHandler({ onPick }: { onPick: (point: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onPick({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

/**
 * Mini map for the admin forms: tapping it reports the coordinates.
 * Browser-only: load it through next/dynamic with ssr: false.
 */
export default function PickerMap({
  points,
  waypoints = [],
  line = [],
  lineStyle = "route",
  routing = false,
  onPick,
  className = "",
}: PickerMapProps) {
  // Initial centre only; MapContainer ignores later changes.
  const center = useMemo<[number, number]>(() => {
    const first = points[0];
    return first ? [first.lat, first.lng] : [PIURA_CENTER.lat, PIURA_CENTER.lng];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom={false}
      className={`aterriza-map isolate h-full w-full cursor-crosshair ${className}`.trim()}
    >
      <TileLayer url={OSM_TILES} attribution={routing ? ROUTING_ATTRIBUTION : OSM_ATTRIBUTION} maxZoom={19} />
      <ClickHandler onPick={onPick} />
      {line.length > 1 && (
        // key: Leaflet applies dashArray only on creation.
        <Polyline
          key={lineStyle}
          positions={line}
          pathOptions={{
            className: "map-route",
            weight: 5,
            opacity: 0.9,
            dashArray: lineStyle === "draft" ? "8 8" : undefined,
          }}
        />
      )}
      {waypoints.map(([lat, lng], index) => (
        <Marker
          key={`wp-${index}-${lat}-${lng}`}
          position={[lat, lng]}
          icon={waypointIcon(index + 1)}
          title={`Punto intermedio ${index + 1}`}
          alt={`Punto intermedio ${index + 1}`}
          interactive={false}
        />
      ))}
      {points.map((p) => (
        <Marker
          key={p.key}
          position={[p.lat, p.lng]}
          icon={pinIcon(p.tone, true)}
          title={p.title}
          alt={p.title}
          interactive={false}
        />
      ))}
    </MapContainer>
  );
}
