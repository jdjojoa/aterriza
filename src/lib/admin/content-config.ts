/**
 * Field definitions for the generic admin CRUD (/admin/contenido/*).
 * Plain data, safe to import from Server and Client Components. The zod
 * schemas in ./schemas.ts are built from these definitions.
 */
import { CUSTOM_CATEGORIES } from "@/lib/customs";
import { PLACE_CATEGORIES } from "@/lib/places";
import { SLANG_CATEGORIES } from "@/lib/slang";
import { TRANSPORT_MODE_LABELS } from "@/lib/transport";

export const CONTENT_TABLES = [
  "medicines",
  "foods",
  "places",
  "transport_routes",
  "slang_terms",
  "customs",
] as const;

export type ContentTable = (typeof CONTENT_TABLES)[number];

export function isContentTable(value: unknown): value is ContentTable {
  return typeof value === "string" && (CONTENT_TABLES as readonly string[]).includes(value);
}

/**
 * Safety rule: medicines and transport fares require a source and show
 * "Verificado" / "Referencial". The other tables have an optional source and
 * no verification step.
 */
export const VERIFIED_TABLES = ["medicines", "transport_routes"] as const satisfies readonly ContentTable[];

export function requiresVerification(table: ContentTable) {
  return (VERIFIED_TABLES as readonly string[]).includes(table);
}

export type SelectOption = { value: string; label: string };

type BaseField = { name: string; label: string; hint?: string; required?: boolean };

export type FieldDef =
  | (BaseField & { kind: "text" | "textarea"; max?: number; placeholder?: string })
  | (BaseField & { kind: "url"; placeholder?: string })
  | (BaseField & { kind: "number"; min?: number; max?: number; step?: number })
  | (BaseField & { kind: "select"; options: SelectOption[] })
  | (BaseField & { kind: "keywords" })
  | (BaseField & { kind: "image" });

/** A lat/lng pair picked by tapping the mini map. */
export type MapPointDef = {
  key: string;
  label: string;
  latField: string;
  lngField: string;
  tone: "green" | "blue";
};

export type MapConfig = {
  points: MapPointDef[];
  /** Name of a jsonb column holding [[lat, lng], ...] drawn by tapping. */
  pathField?: string;
};

export type ContentConfig = {
  table: ContentTable;
  /** Plural label for lists and navigation. */
  label: string;
  /** Singular label for "Nuevo …" / "Editar …". */
  singular: string;
  titleField: string;
  subtitleField?: string;
  /** Text columns searched with ilike. */
  searchFields: string[];
  fields: FieldDef[];
  map?: MapConfig;
  /** Prefilled values for a new row. */
  defaults?: Record<string, string>;
  /** Shown above the form (e.g. medicine rules). */
  notice?: string;
};

export const MEDICINE_DEFAULT_WARNING =
  "Información referencial. No reemplaza la consulta con un profesional de la salud ni la orientación de un químico farmacéutico. Verifica el registro sanitario en DIGEMID.";

const options = (list: readonly { value: string; label: string }[]): SelectOption[] =>
  list.map(({ value, label }) => ({ value, label }));

export const CONTENT_CONFIG: Record<ContentTable, ContentConfig> = {
  medicines: {
    table: "medicines",
    label: "Medicamentos",
    singular: "medicamento",
    titleField: "brand_name_pe",
    subtitleField: "active_ingredient",
    searchFields: ["brand_name_pe", "active_ingredient", "equivalent_co"],
    notice:
      "Nunca escribas dosis ni diagnósticos. No uses las palabras prohibidas; usa siempre «equivalente referencial» y enlaza a DIGEMID.",
    defaults: {
      warning: MEDICINE_DEFAULT_WARNING,
      digemid_url: "https://www.digemid.minsa.gob.pe/",
    },
    fields: [
      { kind: "text", name: "brand_name_pe", label: "Nombre comercial en Perú", required: true, max: 120 },
      { kind: "text", name: "active_ingredient", label: "Principio activo", required: true, max: 200 },
      { kind: "text", name: "presentation", label: "Presentación", max: 200, placeholder: "Ej.: Tabletas, jarabe" },
      { kind: "textarea", name: "general_use", label: "Uso general", max: 500, hint: "Sin dosis ni diagnósticos." },
      { kind: "text", name: "equivalent_co", label: "Equivalente referencial en Colombia", max: 200 },
      { kind: "text", name: "where_to_buy", label: "Dónde comprar", max: 200 },
      { kind: "textarea", name: "warning", label: "Aviso", required: true, max: 600 },
      { kind: "url", name: "digemid_url", label: "Enlace a DIGEMID", required: true },
      { kind: "keywords", name: "keywords", label: "Palabras clave", hint: "Separadas por comas." },
    ],
  },
  foods: {
    table: "foods",
    label: "Comidas",
    singular: "comida",
    titleField: "name",
    subtitleField: "similar_co",
    searchFields: ["name", "main_ingredients", "similar_co"],
    fields: [
      { kind: "text", name: "name", label: "Nombre", required: true, max: 120 },
      { kind: "textarea", name: "description", label: "Descripción", max: 800 },
      { kind: "text", name: "main_ingredients", label: "Ingredientes principales", max: 300 },
      { kind: "text", name: "similar_co", label: "Parecido en Colombia", max: 200 },
      { kind: "text", name: "where_to_try", label: "Dónde probarla", max: 300 },
      { kind: "image", name: "image_url", label: "Foto" },
      { kind: "keywords", name: "keywords", label: "Palabras clave", hint: "Separadas por comas." },
    ],
  },
  places: {
    table: "places",
    label: "Lugares",
    singular: "lugar",
    titleField: "name",
    subtitleField: "address",
    searchFields: ["name", "address", "description"],
    fields: [
      { kind: "text", name: "name", label: "Nombre", required: true, max: 150 },
      { kind: "select", name: "category", label: "Categoría", required: true, options: options(PLACE_CATEGORIES) },
      { kind: "textarea", name: "description", label: "Descripción", max: 800 },
      { kind: "text", name: "address", label: "Dirección", max: 250 },
      { kind: "text", name: "hours", label: "Horario", max: 200 },
      { kind: "text", name: "price_info", label: "Precios", max: 200 },
      { kind: "image", name: "image_url", label: "Foto" },
    ],
    map: {
      points: [{ key: "point", label: "Ubicación", latField: "lat", lngField: "lng", tone: "green" }],
    },
  },
  transport_routes: {
    table: "transport_routes",
    label: "Rutas",
    singular: "ruta",
    titleField: "name",
    subtitleField: "code",
    searchFields: ["name", "code", "origin_name", "destination_name"],
    fields: [
      { kind: "text", name: "name", label: "Nombre", required: true, max: 150 },
      { kind: "text", name: "code", label: "Código", max: 30, placeholder: "Ej.: 2A" },
      {
        kind: "select",
        name: "mode",
        label: "Tipo de transporte",
        required: true,
        options: Object.entries(TRANSPORT_MODE_LABELS).map(([value, label]) => ({ value, label })),
      },
      { kind: "text", name: "origin_name", label: "Origen", max: 150 },
      { kind: "text", name: "destination_name", label: "Destino", max: 150 },
      { kind: "number", name: "fare_min", label: "Tarifa mínima (S/)", min: 0, max: 1000, step: 0.1 },
      { kind: "number", name: "fare_max", label: "Tarifa máxima (S/)", min: 0, max: 1000, step: 0.1 },
      { kind: "text", name: "schedule", label: "Horario", max: 200 },
      { kind: "textarea", name: "tips", label: "Consejos", max: 800 },
    ],
    map: {
      points: [
        { key: "origin", label: "Origen", latField: "origin_lat", lngField: "origin_lng", tone: "green" },
        { key: "destination", label: "Destino", latField: "destination_lat", lngField: "destination_lng", tone: "blue" },
      ],
      pathField: "path",
    },
  },
  slang_terms: {
    table: "slang_terms",
    label: "Jerga",
    singular: "término",
    titleField: "term",
    subtitleField: "meaning",
    searchFields: ["term", "meaning", "equivalent_co"],
    fields: [
      { kind: "text", name: "term", label: "Término", required: true, max: 100 },
      { kind: "textarea", name: "meaning", label: "Significado", required: true, max: 500 },
      { kind: "text", name: "equivalent_co", label: "Equivalente en Colombia", max: 200 },
      { kind: "textarea", name: "example", label: "Ejemplo", max: 300 },
      { kind: "select", name: "category", label: "Categoría", options: options(SLANG_CATEGORIES) },
    ],
  },
  customs: {
    table: "customs",
    label: "Costumbres",
    singular: "costumbre",
    titleField: "title",
    subtitleField: "category",
    searchFields: ["title", "body"],
    fields: [
      { kind: "text", name: "title", label: "Título", required: true, max: 150 },
      { kind: "textarea", name: "body", label: "Texto", required: true, max: 1200 },
      { kind: "select", name: "category", label: "Categoría", options: options(CUSTOM_CATEGORIES) },
    ],
  },
};

/** Columns every list/form reads, besides the table's own fields. */
export const COMMON_COLUMNS = [
  "id",
  "source_name",
  "source_url",
  "verified_at",
  "is_published",
  "updated_at",
] as const;

/** All columns the admin form edits for a table. */
export function formColumns(config: ContentConfig) {
  const columns: string[] = config.fields.map((f) => f.name);
  for (const point of config.map?.points ?? []) columns.push(point.latField, point.lngField);
  if (config.map?.pathField) columns.push(config.map.pathField);
  return columns;
}
