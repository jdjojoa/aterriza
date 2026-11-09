"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./MapView";

export type { MapMarker, MapViewProps, MarkerTone } from "./MapView";

/** Placeholder shown while the Leaflet bundle downloads. */
export function MapSkeleton() {
  return (
    <div
      role="status"
      className="flex h-full w-full animate-pulse items-center justify-center bg-accent-soft text-sm font-bold text-on-accent-soft"
    >
      Cargando mapa…
    </div>
  );
}

/** Leaflet touches `window`, so the map renders only in the browser. */
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: MapSkeleton,
});

export function DynamicMapView(props: MapViewProps) {
  return <MapView {...props} />;
}
