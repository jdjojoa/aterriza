"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { MapSkeleton } from "@/components/map/DynamicMapView";
import type { PickerPoint } from "@/components/map/PickerMap";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import type { MapConfig } from "@/lib/admin/content-config";
import type { LatLng } from "@/lib/maps";
import { MAX_WAYPOINTS } from "@/lib/transport";
import type { RoutePath, RoutePathSource } from "@/types/database";

const PickerMap = dynamic(() => import("@/components/map/PickerMap"), {
  ssr: false,
  loading: MapSkeleton,
});

/** Geometry stored for a route (computed on the server when saving). */
export type RoutePreview = { path: RoutePath; source: RoutePathSource | null };

type LocationFieldsProps = {
  map: MapConfig;
  values: Record<string, string>;
  errors: Record<string, string>;
  routePreview?: RoutePreview | null;
  /** Shows "Recalcular recorrido" (existing rows only). */
  canRecalculate?: boolean;
};

const WAYPOINT_MODE = "__waypoint";

function parsePoints(value: string): [number, number][] {
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

const SOURCE_LABELS: Record<"osrm" | "straight" | "legacy", string> = {
  osrm: "Recorrido guardado por las calles (OSRM).",
  straight: "Recorrido guardado como línea recta: OSRM no respondió. Pulsa «Recalcular recorrido».",
  legacy: "Recorrido antiguo (aproximado). Guarda o pulsa «Recalcular recorrido» para seguir las calles.",
};

/**
 * Coordinates for places and routes: tap the mini map to set the active point
 * or to add an intermediate point (waypoint) to a route. The server turns
 * origin → waypoints → destination into street geometry when saving. The
 * number inputs keep it usable without the map (keyboard, screen readers).
 */
export function LocationFields({
  map,
  values,
  errors,
  routePreview = null,
  canRecalculate = false,
}: LocationFieldsProps) {
  const [coords, setCoords] = useState(() =>
    Object.fromEntries(
      map.points.map((p) => [p.key, { lat: values[p.latField] ?? "", lng: values[p.lngField] ?? "" }]),
    ),
  );
  const initialWaypoints = map.waypointsField ? (values[map.waypointsField] ?? "") : "";
  const [waypoints, setWaypoints] = useState<[number, number][]>(() => parsePoints(initialWaypoints));
  const [mode, setMode] = useState(map.points[0]?.key ?? WAYPOINT_MODE);
  const [initialSnapshot] = useState(() => JSON.stringify([coords, parsePoints(initialWaypoints)]));

  const setPoint = (key: string, next: Partial<{ lat: string; lng: string }>) =>
    setCoords((current) => ({ ...current, [key]: { ...current[key], ...next } }));

  const waypointsFull = waypoints.length >= MAX_WAYPOINTS;

  function handlePick(point: LatLng) {
    if (mode === WAYPOINT_MODE) {
      if (!waypointsFull) setWaypoints((current) => [...current, [point.lat, point.lng]]);
    } else {
      setPoint(mode, { lat: String(point.lat), lng: String(point.lng) });
    }
  }

  const markers: PickerPoint[] = map.points.flatMap((p) => {
    const lat = Number(coords[p.key].lat);
    const lng = Number(coords[p.key].lng);
    return coords[p.key].lat !== "" && coords[p.key].lng !== "" && Number.isFinite(lat) && Number.isFinite(lng)
      ? [{ key: p.key, title: p.label, tone: p.tone, lat, lng }]
      : [];
  });

  // Unchanged points: show the stored street geometry. Changed: a dashed
  // draft through the points, recalculated by the server on save.
  const unchanged = JSON.stringify([coords, waypoints]) === initialSnapshot;
  const origin = markers.find((m) => m.key === map.points[0]?.key);
  const destination = markers.find((m) => m.key === map.points[1]?.key);
  const draft: [number, number][] = [
    ...(origin ? [[origin.lat, origin.lng] as [number, number]] : []),
    ...waypoints,
    ...(destination ? [[destination.lat, destination.lng] as [number, number]] : []),
  ];
  const showStored = Boolean(map.waypointsField && unchanged && routePreview && routePreview.path.length > 1);
  const line = showStored ? routePreview!.path : map.waypointsField ? draft : [];

  const activeLabel =
    mode === WAYPOINT_MODE ? "un punto intermedio" : `«${map.points.find((p) => p.key === mode)?.label}»`;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-bold text-heading">Ubicación en el mapa</legend>
      {(map.points.length > 1 || map.waypointsField) && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Qué marcar al tocar el mapa">
          {map.points.map((p) => (
            <Chip key={p.key} selected={mode === p.key} onClick={() => setMode(p.key)}>
              {p.label}
            </Chip>
          ))}
          {map.waypointsField && (
            <Chip selected={mode === WAYPOINT_MODE} onClick={() => setMode(WAYPOINT_MODE)}>
              Punto intermedio
            </Chip>
          )}
        </div>
      )}
      <p className="text-sm text-muted" aria-live="polite">
        {mode === WAYPOINT_MODE && waypointsFull
          ? `Llegaste al máximo de ${MAX_WAYPOINTS} puntos intermedios.`
          : `Toca el mapa para marcar ${activeLabel}.`}
      </p>
      <div className="h-64 overflow-hidden rounded-2xl border border-border/30">
        <PickerMap
          points={markers}
          waypoints={map.waypointsField ? waypoints : []}
          line={line}
          lineStyle={showStored && routePreview?.source === "osrm" ? "route" : "draft"}
          routing={Boolean(map.waypointsField)}
          onPick={handlePick}
        />
      </div>

      {map.waypointsField && (
        <p className="text-sm text-foreground" aria-live="polite">
          {showStored
            ? SOURCE_LABELS[routePreview!.source ?? "legacy"]
            : draft.length > 1
              ? "Línea punteada: borrador. Al guardar, el recorrido se calcula por las calles."
              : "Marca origen y destino para calcular el recorrido."}
        </p>
      )}

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

      {map.waypointsField && (
        <div className="flex flex-col gap-2">
          <input type="hidden" name={map.waypointsField} value={JSON.stringify(waypoints)} />
          <h3 className="text-sm font-bold text-heading">
            Puntos intermedios: {waypoints.length} de {MAX_WAYPOINTS}
          </h3>
          <p className="text-sm text-muted">
            Las combis no siempre van por el camino más corto. Agrega puntos por donde pasa la ruta, en orden
            de origen a destino.
          </p>
          {waypoints.length > 0 && (
            <ol className="flex flex-col gap-1">
              {waypoints.map(([lat, lng], index) => (
                <li
                  key={`${index}-${lat}-${lng}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/30 px-3 py-1 text-sm"
                >
                  <span>
                    <span className="font-bold text-heading">{index + 1}.</span> {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setWaypoints((c) => c.filter((_, i) => i !== index))}
                    aria-label={`Quitar punto intermedio ${index + 1}`}
                  >
                    Quitar
                  </Button>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!waypoints.length} onClick={() => setWaypoints((c) => c.slice(0, -1))}>
              Deshacer último punto
            </Button>
            <Button variant="ghost" disabled={!waypoints.length} onClick={() => setWaypoints([])}>
              Borrar puntos intermedios
            </Button>
          </div>
          {errors[map.waypointsField] && (
            <p className="text-sm font-bold text-on-warning-soft">{errors[map.waypointsField]}</p>
          )}
          {canRecalculate && <RecalculateButton />}
        </div>
      )}
    </fieldset>
  );
}

/** Saves the form and asks the server for the street route again, even if nothing changed. */
function RecalculateButton() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-1">
      <Button type="submit" name="intent" value="recalculate" variant="secondary" disabled={pending}>
        {pending ? "Calculando…" : "Recalcular recorrido"}
      </Button>
      <p className="text-sm text-muted">Guarda los cambios y vuelve a pedir el recorrido por las calles.</p>
    </div>
  );
}
