"use client";

import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import { PIURA_CENTER, type LatLng } from "@/lib/maps";
import { OSM_ATTRIBUTION, OSM_TILES, pinIcon, type MarkerTone } from "./MapView";

export type PickerPoint = LatLng & { key: string; title: string; tone: MarkerTone };

export type PickerMapProps = {
  points: PickerPoint[];
  line?: [number, number][];
  onPick: (point: LatLng) => void;
  className?: string;
};

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
export default function PickerMap({ points, line = [], onPick, className = "" }: PickerMapProps) {
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
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} maxZoom={19} />
      <ClickHandler onPick={onPick} />
      {line.length > 1 && (
        <Polyline positions={line} pathOptions={{ className: "map-route", weight: 5, opacity: 0.9 }} />
      )}
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
