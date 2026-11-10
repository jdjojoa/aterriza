"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapSkeleton } from "@/components/map/DynamicMapView";
import type { PickerPoint } from "@/components/map/PickerMap";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import type { MapConfig } from "@/lib/admin/content-config";
import type { LatLng } from "@/lib/maps";

const PickerMap = dynamic(() => import("@/components/map/PickerMap"), {
  ssr: false,
  loading: MapSkeleton,
});

type LocationFieldsProps = {
  map: MapConfig;
  values: Record<string, string>;
  errors: Record<string, string>;
};

const PATH_MODE = "__path";

function parsePath(value: string): [number, number][] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (p): p is [number, number] =>
            Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number"),
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Coordinates for places and routes: tap the mini map to set the active point
 * (or add a point to the route line). The number inputs keep it usable
 * without the map (keyboard, screen readers).
 */
export function LocationFields({ map, values, errors }: LocationFieldsProps) {
  const [coords, setCoords] = useState(() =>
    Object.fromEntries(
      map.points.map((p) => [p.key, { lat: values[p.latField] ?? "", lng: values[p.lngField] ?? "" }]),
    ),
  );
  const [path, setPath] = useState<[number, number][]>(() =>
    map.pathField ? parsePath(values[map.pathField] ?? "") : [],
  );
  const [mode, setMode] = useState(map.points[0]?.key ?? PATH_MODE);

  const setPoint = (key: string, next: Partial<{ lat: string; lng: string }>) =>
    setCoords((current) => ({ ...current, [key]: { ...current[key], ...next } }));

  function handlePick(point: LatLng) {
    if (mode === PATH_MODE) setPath((current) => [...current, [point.lat, point.lng]]);
    else setPoint(mode, { lat: String(point.lat), lng: String(point.lng) });
  }

  const markers: PickerPoint[] = map.points.flatMap((p) => {
    const lat = Number(coords[p.key].lat);
    const lng = Number(coords[p.key].lng);
    return coords[p.key].lat !== "" && coords[p.key].lng !== "" && Number.isFinite(lat) && Number.isFinite(lng)
      ? [{ key: p.key, title: p.label, tone: p.tone, lat, lng }]
      : [];
  });

  const activeLabel =
    mode === PATH_MODE ? "un punto al trazo" : `«${map.points.find((p) => p.key === mode)?.label}»`;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-bold text-heading">Ubicación en el mapa</legend>
      {(map.points.length > 1 || map.pathField) && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Qué marcar al tocar el mapa">
          {map.points.map((p) => (
            <Chip key={p.key} selected={mode === p.key} onClick={() => setMode(p.key)}>
              {p.label}
            </Chip>
          ))}
          {map.pathField && (
            <Chip selected={mode === PATH_MODE} onClick={() => setMode(PATH_MODE)}>
              Trazo
            </Chip>
          )}
        </div>
      )}
      <p className="text-sm text-muted" aria-live="polite">
        Toca el mapa para marcar {activeLabel}.
      </p>
      <div className="h-64 overflow-hidden rounded-2xl border border-border/30">
        <PickerMap points={markers} line={path} onPick={handlePick} />
      </div>

      {map.points.map((p) => (
        <div key={p.key} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label={`${p.label}: latitud`}
              name={p.latField}
              inputMode="decimal"
              value={coords[p.key].lat}
              onChange={(e) => setPoint(p.key, { lat: e.target.value })}
              error={errors[p.latField]}
            />
            <Input
              label={`${p.label}: longitud`}
              name={p.lngField}
              inputMode="decimal"
              value={coords[p.key].lng}
              onChange={(e) => setPoint(p.key, { lng: e.target.value })}
              error={errors[p.lngField]}
            />
          </div>
          {(coords[p.key].lat || coords[p.key].lng) && (
            <Button variant="ghost" className="self-start" onClick={() => setPoint(p.key, { lat: "", lng: "" })}>
              Quitar {p.label.toLowerCase()}
            </Button>
          )}
        </div>
      ))}

      {map.pathField && (
        <div className="flex flex-col gap-2">
          <input type="hidden" name={map.pathField} value={path.length ? JSON.stringify(path) : ""} />
          <p className="text-sm text-foreground">
            Trazo: {path.length} {path.length === 1 ? "punto" : "puntos"}
            {path.length === 1 && " (se necesitan al menos 2)"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!path.length} onClick={() => setPath((c) => c.slice(0, -1))}>
              Deshacer último punto
            </Button>
            <Button variant="ghost" disabled={!path.length} onClick={() => setPath([])}>
              Borrar trazo
            </Button>
          </div>
          {errors[map.pathField] && (
            <p className="text-sm font-bold text-on-warning-soft">{errors[map.pathField]}</p>
          )}
        </div>
      )}
    </fieldset>
  );
}
