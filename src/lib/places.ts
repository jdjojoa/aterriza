import type { Place, PlaceCategory } from "@/types/database";

/** Category labels, in the order the filter chips show them. */
export const PLACE_CATEGORIES: { value: PlaceCategory; label: string }[] = [
  { value: "universidad", label: "Universidades" },
  { value: "salud", label: "Salud" },
  { value: "tramites", label: "Trámites" },
  { value: "comida", label: "Comida" },
  { value: "compras", label: "Compras" },
  { value: "turistico", label: "Turístico" },
];

export function placeCategoryLabel(category: PlaceCategory) {
  return PLACE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

/** Columns the Lugares screen needs. */
export const PLACE_COLUMNS =
  "id, name, category, description, address, lat, lng, hours, price_info, source_name, source_url, verified_at" as const;

export type PlaceItem = Pick<
  Place,
  | "id"
  | "name"
  | "category"
  | "description"
  | "address"
  | "lat"
  | "lng"
  | "hours"
  | "price_info"
  | "source_name"
  | "source_url"
  | "verified_at"
>;
