"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { Icon } from "@/components/icons/Icon";
import { DynamicMapView, type MapMarker } from "@/components/map/DynamicMapView";
import { googleMapsDirectionsUrl, googleMapsSearchUrl, toLatLng, type LatLng } from "@/lib/maps";
import {
  TRANSPORT_MODE_LABELS,
  formatFare,
  parseRoutePath,
  type RouteItem,
} from "@/lib/transport";

const linkSr = <span className="sr-only"> (se abre en una pestaña nueva)</span>;

export function RoutesExplorer({ routes }: { routes: RouteItem[] }) {
  const [selectedId, setSelectedId] = useState<string>(routes[0].id);
  const selected = routes.find((r) => r.id === selectedId) ?? routes[0];

  const origin = toLatLng(selected.origin_lat, selected.origin_lng);
  const destination = toLatLng(selected.destination_lat, selected.destination_lng);

  // Stored path when there is one; otherwise a straight line origin → destination.
  const path = parseRoutePath(selected.path);
  const line: [number, number][] | null =
    path ??
    (origin && destination
      ? [
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
        ]
      : null);

  const markers: MapMarker[] = [];
  if (origin) {
    markers.push({ id: "origin", ...origin, title: `Origen: ${selected.origin_name ?? "sin nombre"}`, tone: "green" });
  }
  if (destination) {
    markers.push({
      id: "destination",
      ...destination,
      title: `Destino: ${selected.destination_name ?? "sin nombre"}`,
      tone: "blue",
    });
  }

  // MapView refits only when the coordinates change, not on every render.
  const focus: LatLng[] | null = line ? line.map(([lat, lng]) => ({ lat, lng })) : null;

  return (
    <>
      <section aria-labelledby="selected-route" className="flex flex-col gap-3">
        <div className="h-64 overflow-hidden rounded-2xl border border-border/30">
          <DynamicMapView markers={markers} line={line} focus={focus} />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted" aria-label="Leyenda del mapa">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-full bg-[var(--map-green)]" />
            Origen
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-full bg-[var(--map-blue)]" />
            Destino
          </li>
          {!path && line && <li>Línea recta: recorrido aproximado</li>}
        </ul>

        <div className="flex flex-col gap-3 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm">
          <h2 id="selected-route" className="text-xl font-extrabold text-heading">
            {selected.name}
          </h2>
          <RouteFacts route={selected} />
          {selected.tips && (
            <div>
              <h3 className="text-sm font-bold text-heading">Consejos</h3>
              <p className="whitespace-pre-line text-foreground">{selected.tips}</p>
            </div>
          )}
          {origin && destination && (
            <a
              href={googleMapsDirectionsUrl(origin, destination)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("primary", "md", "w-full")}
            >
              <Icon name="external-link" size={18} />
              Abrir en Google Maps
              {linkSr}
            </a>
          )}
          <div className="grid grid-cols-2 gap-2">
            {origin && (
              <a
                href={googleMapsSearchUrl(origin)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "md", "text-sm")}
              >
                Ver origen
                {linkSr}
              </a>
            )}
            {destination && (
              <a
                href={googleMapsSearchUrl(destination)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "md", "text-sm")}
              >
                Ver destino
                {linkSr}
              </a>
            )}
          </div>
          <SourceBadge
            sourceName={selected.source_name}
            sourceUrl={selected.source_url}
            verifiedAt={selected.verified_at}
          />
        </div>
      </section>

      <section aria-labelledby="all-routes" className="flex flex-col gap-3">
        <h2 id="all-routes" className="text-lg font-extrabold text-heading">
          Rutas ({routes.length})
        </h2>
        <ul className="flex flex-col gap-3">
          {routes.map((r) => {
            const active = r.id === selected.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedId(r.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex w-full flex-col gap-2 rounded-2xl border-2 p-4 text-left shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    active
                      ? "border-primary-edge bg-accent-soft"
                      : "border-border/30 bg-surface hover:bg-hover"
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge>{TRANSPORT_MODE_LABELS[r.mode]}</Badge>
                    {r.code && <span className="text-sm font-bold text-muted">{r.code}</span>}
                  </span>
                  <span className="font-bold text-heading">{r.name}</span>
                  <span className="text-sm text-foreground">
                    {formatFare(r.fare_min, r.fare_max)}
                    {r.schedule && ` · ${r.schedule}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function RouteFacts({ route }: { route: RouteItem }) {
  const fare = formatFare(route.fare_min, route.fare_max);
  return (
    <dl className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
      <div>
        <dt className="text-sm font-bold text-heading">Modo</dt>
        <dd>{TRANSPORT_MODE_LABELS[route.mode]}</dd>
      </div>
      <div>
        <dt className="text-sm font-bold text-heading">Tarifa</dt>
        <dd>
          {route.fare_min === null && route.fare_max === null ? (
            <Badge variant="warning">{fare}</Badge>
          ) : (
            fare
          )}
        </dd>
      </div>
      <div>
        <dt className="text-sm font-bold text-heading">Origen</dt>
        <dd>{route.origin_name || "Por verificar"}</dd>
      </div>
      <div>
        <dt className="text-sm font-bold text-heading">Destino</dt>
        <dd>{route.destination_name || "Por verificar"}</dd>
      </div>
      <div className="min-[360px]:col-span-2">
        <dt className="text-sm font-bold text-heading">Horario</dt>
        <dd>{route.schedule || "Por verificar"}</dd>
      </div>
    </dl>
  );
}
