/**
 * zod validation for the admin CRUD, built from content-config.ts.
 * Used by the Server Actions (source of truth) and safe to use in the browser.
 */
import { z } from "zod";
import { isSafeMedicineText } from "@/lib/medicine-safety";
import { MAX_WAYPOINTS } from "@/lib/transport";
import {
  formColumns,
  requiresVerification,
  type ContentConfig,
  type FieldDef,
} from "./content-config";

const REQUIRED = "Este campo es obligatorio.";
const SOURCE_REQUIRED =
  "Obligatorio: sin fuente no se puede guardar ni marcar como verificado.";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const emptyToNull = (value: string) => (value === "" ? null : value);
const tooLong = (max: number) => `Usa como máximo ${max} caracteres.`;

function textSchema(max: number, required: boolean, requiredMessage = REQUIRED) {
  const base = z.string().trim().max(max, tooLong(max));
  return required ? base.min(1, requiredMessage) : base.transform(emptyToNull);
}

function urlSchema(required: boolean, requiredMessage = REQUIRED) {
  const base = z
    .string()
    .trim()
    .max(500, tooLong(500))
    .refine((v) => v === "" || isHttpUrl(v), "Escribe un enlace completo que empiece por https://");
  return required
    ? base.refine((v) => v !== "", requiredMessage)
    : base.transform(emptyToNull);
}

function numberSchema(min: number, max: number) {
  return z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .refine((v) => v === null || Number.isFinite(v), "Escribe un número.")
    .refine(
      (v) => v === null || (v >= min && v <= max),
      `Debe estar entre ${min} y ${max}.`,
    );
}

function selectSchema(values: string[], required: boolean) {
  return z
    .string()
    .trim()
    .refine((v) => (v === "" ? !required : values.includes(v)), required ? "Elige una opción." : "Opción no válida.")
    .transform(emptyToNull);
}

const keywordsSchema = z
  .string()
  .transform((v) =>
    Array.from(
      new Set(
        v
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      ),
    ),
  )
  .refine((list) => list.length <= 30, "Usa como máximo 30 palabras clave.")
  .refine((list) => list.every((k) => k.length <= 50), "Cada palabra clave debe tener como máximo 50 caracteres.");

const latSchema = numberSchema(-90, 90);
const lngSchema = numberSchema(-180, 180);

function parseJson(value: string): unknown {
  if (value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

const waypointsSchema = z
  .string()
  .transform(parseJson)
  .pipe(
    z
      .array(
        z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
        { error: "Puntos intermedios no válidos." },
      )
      .max(MAX_WAYPOINTS, `Usa como máximo ${MAX_WAYPOINTS} puntos intermedios.`)
      .nullable()
      .transform((points) => points ?? []),
  );

function fieldSchema(field: FieldDef) {
  const required = Boolean(field.required);
  switch (field.kind) {
    case "text":
    case "textarea":
      return textSchema(field.max ?? 500, required);
    case "url":
      return urlSchema(required);
    case "image":
      return urlSchema(false);
    case "number":
      return numberSchema(field.min ?? 0, field.max ?? 1_000_000);
    case "select":
      return selectSchema(field.options.map((o) => o.value), required);
    case "keywords":
      return keywordsSchema;
    case "checkbox":
      return z.string().transform((v) => v === "on");
  }
}

/** Source fields for medicines and transport: required, they gate verification. */
export const sourceSchema = z.object({
  source_name: textSchema(200, true, SOURCE_REQUIRED),
  source_url: urlSchema(true, SOURCE_REQUIRED),
});

/** Source fields for places, foods, slang and customs: optional. */
const optionalSourceSchema = z.object({
  source_name: textSchema(200, false),
  source_url: urlSchema(false),
});

/** Schema for one content table. Output keys match the table columns. */
export function contentSchema(config: ContentConfig) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of config.fields) shape[field.name] = fieldSchema(field);
  for (const point of config.map?.points ?? []) {
    shape[point.latField] = latSchema;
    shape[point.lngField] = lngSchema;
  }
  if (config.map?.waypointsField) shape[config.map.waypointsField] = waypointsSchema;

  return z
    .object({
      ...shape,
      ...(requiresVerification(config.table) ? sourceSchema : optionalSourceSchema).shape,
      is_published: z.boolean(),
    })
    .superRefine((values: Record<string, unknown>, ctx) => {
      // A map point needs both coordinates or none.
      for (const point of config.map?.points ?? []) {
        const hasLat = values[point.latField] !== null;
        const hasLng = values[point.lngField] !== null;
        if (hasLat !== hasLng) {
          ctx.addIssue({
            code: "custom",
            path: [hasLat ? point.lngField : point.latField],
            message: `Completa latitud y longitud de «${point.label}», o déjalas vacías.`,
          });
        }
      }

      const range =
        config.table === "transport_routes"
          ? (["fare_min", "fare_max", "La tarifa máxima no puede ser menor que la mínima."] as const)
          : config.table === "arrival_routes"
            ? (["precio_min", "precio_max", "El precio máximo no puede ser menor que el mínimo."] as const)
            : null;
      if (range) {
        const min = values[range[0]] as number | null;
        const max = values[range[1]] as number | null;
        if (min !== null && max !== null && min > max) {
          ctx.addIssue({ code: "custom", path: [range[1]], message: range[2] });
        }
      }

      // Project rule: medicine text never carries doses or forbidden words.
      if (config.table === "medicines") {
        for (const field of config.fields) {
          if (field.kind === "url") continue;
          const value = values[field.name];
          const text = Array.isArray(value) ? value.join(", ") : value;
          if (typeof text === "string" && text && !isSafeMedicineText(text)) {
            ctx.addIssue({
              code: "custom",
              path: [field.name],
              message:
                "Quita dosis, frecuencias o palabras prohibidas. Usa «equivalente referencial».",
            });
          }
        }
      }
    });
}

/** Text values of the form, keyed by column. Also used to refill the form. */
export type RawFormValues = Record<string, string>;

export function rawValuesFromFormData(config: ContentConfig, formData: FormData): RawFormValues {
  const values: RawFormValues = {};
  for (const column of [...formColumns(config), "source_name", "source_url"]) {
    const value = formData.get(column);
    values[column] = typeof value === "string" ? value : "";
  }
  values.is_published = formData.get("is_published") === "on" ? "on" : "";
  return values;
}

/** Turns a DB row into the text values the form shows. */
export function rawValuesFromRow(
  config: ContentConfig,
  row: Record<string, unknown> | null,
): RawFormValues {
  const values: RawFormValues = {};
  for (const column of [...formColumns(config), "source_name", "source_url"]) {
    const value = row?.[column];
    if (value === null || value === undefined) values[column] = config.defaults?.[column] ?? "";
    else if (typeof value === "boolean") values[column] = value ? "on" : "";
    else if (column === config.map?.waypointsField) values[column] = JSON.stringify(value);
    else if (Array.isArray(value)) values[column] = value.join(", ");
    else values[column] = String(value);
  }
  values.is_published = row === null || row.is_published ? "on" : "";
  return values;
}

export function parseContent(config: ContentConfig, raw: RawFormValues) {
  return contentSchema(config).safeParse({ ...raw, is_published: raw.is_published === "on" });
}

/** First error message per field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    result[key] ??= issue.message;
  }
  return result;
}
