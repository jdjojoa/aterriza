"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { buttonClasses } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SourceLink } from "@/components/ui/SourceLink";
import { Icon } from "@/components/icons/Icon";
import { DynamicMapView, type MapMarker } from "@/components/map/DynamicMapView";
import { Reviews } from "@/components/reviews/Reviews";
import { googleMapsPlaceUrl, toLatLng } from "@/lib/maps";
import { PLACE_CATEGORIES, placeCategoryLabel, type PlaceItem } from "@/lib/places";
import type { PlaceCategory } from "@/types/database";

type View = "map" | "list";

export function PlacesExplorer({ places }: { places: PlaceItem[] }) {
  const [category, setCategory] = useState<PlaceCategory | "all">("all");
  const [view, setView] = useState<View>("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Only offer chips for categories that have content.
  const categories = useMemo(
    () => PLACE_CATEGORIES.filter((c) => places.some((p) => p.category === c.value)),
    [places],
  );

  const visible = useMemo(
    () => (category === "all" ? places : places.filter((p) => p.category === category)),
    [places, category],
  );

  const markers = useMemo<MapMarker[]>(
    () =>
      visible.flatMap((p) => {
        const point = toLatLng(p.lat, p.lng);
        return point
          ? [
              {
                id: p.id,
                ...point,
                title: p.name,
                tone: p.id === selectedId ? "primary" : "accent",
                emphasized: p.id === selectedId,
              } satisfies MapMarker,
            ]
          : [];
      }),
    [visible, selectedId],
  );

  const selected = places.find((p) => p.id === selectedId) ?? null;
  const withoutLocation = visible.length - markers.length;

  return (
    <>
      <div
        role="group"
        aria-label="Filtrar por categoría"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        <Chip selected={category === "all"} onClick={() => setCategory("all")}>
          Todos
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.value}
            selected={category === c.value}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {visible.length === 1 ? "1 lugar" : `${visible.length} lugares`}
        </p>
        <div role="group" aria-label="Tipo de vista" className="flex gap-2">
          <Chip selected={view === "map"} onClick={() => setView("map")}>
            <Icon name="map" size={18} />
            Mapa
          </Chip>
          <Chip selected={view === "list"} onClick={() => setView("list")}>
            <Icon name="list" size={18} />
            Lista
          </Chip>
        </div>
      </div>

      {view === "map" ? (
        <div className="flex flex-col gap-2">
          <div className="h-[55dvh] min-h-72 overflow-hidden rounded-2xl border border-border/30">
            <DynamicMapView markers={markers} onMarkerClick={setSelectedId} />
          </div>
          <p className="text-sm text-muted">
            Toca un marcador para ver los detalles.
            {withoutLocation > 0 &&
              ` ${withoutLocation} sin ubicación en el mapa: míralos en la lista.`}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelectedId(p.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/30 bg-surface p-4 text-left shadow-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-bold text-heading">{p.name}</span>
                  <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <Badge>{placeCategoryLabel(p.category)}</Badge>
                    {p.address && <span className="truncate">{p.address}</span>}
                  </span>
                </span>
                <span className="text-muted">
                  <Icon name="chevron-right" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ""}
      >
        {selected && <PlaceDetails place={selected} />}
      </BottomSheet>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm font-bold text-heading">{label}</dt>
      <dd className="text-foreground">{value || "Sin información"}</dd>
    </div>
  );
}

function PlaceDetails({ place }: { place: PlaceItem }) {
  const mapsUrl = googleMapsPlaceUrl(place);

  return (
    <>
      <div>
        <Badge>{placeCategoryLabel(place.category)}</Badge>
      </div>
      {place.description && <p className="text-foreground">{place.description}</p>}
      <dl className="flex flex-col gap-3">
        {place.address && <Detail label="Dirección" value={place.address} />}
        <Detail label="Horario" value={place.hours} />
        <Detail label="Precio" value={place.price_info} />
      </dl>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses("primary", "md", "w-full")}
      >
        <Icon name="external-link" size={18} />
        Abrir en Google Maps
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
      </a>
      <SourceLink sourceName={place.source_name} sourceUrl={place.source_url} className="-my-2" />
      <Reviews key={place.id} targetType="place" targetId={place.id} />
    </>
  );
}
