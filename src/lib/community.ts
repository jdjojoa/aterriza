/** Shared constants and helpers for reviews, reports and tips (client and server safe). */

export const REVIEW_MAX_LENGTH = 500;
export const TIP_MIN_LENGTH = 10;
export const TIP_MAX_LENGTH = 500;
export const REPORT_DETAIL_MAX_LENGTH = 300;
/** Pending tips a user may have at once (keeps the moderation queue small). */
export const MAX_PENDING_TIPS = 5;

export const REPORT_REASONS = [
  { value: "ofensivo", label: "Ofensivo", description: "Insultos, odio o acoso." },
  { value: "falso", label: "Falso", description: "Información engañosa o inventada." },
  { value: "spam", label: "Spam", description: "Publicidad o contenido repetido." },
  { value: "otro", label: "Otro", description: "Cuéntanos qué pasa." },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const TIP_CATEGORIES = [
  { value: "llegada", label: "Llegada" },
  { value: "transporte", label: "Transporte" },
  { value: "vivienda", label: "Vivienda" },
  { value: "comida", label: "Comida" },
  { value: "salud", label: "Salud" },
  { value: "tramites", label: "Trámites" },
  { value: "universidad", label: "Universidad" },
  { value: "dinero", label: "Dinero" },
  { value: "seguridad", label: "Seguridad" },
  { value: "otro", label: "Otro" },
] as const;

export type TipCategory = (typeof TIP_CATEGORIES)[number]["value"];

export function isTipCategory(value: unknown): value is TipCategory {
  return TIP_CATEGORIES.some((c) => c.value === value);
}

export function tipCategoryLabel(value: string | null) {
  return TIP_CATEGORIES.find((c) => c.value === value)?.label ?? "General";
}

// Fixed locale and time zone so server and client render the same text.
const dateFormat = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
});

/** "2026-11-09T20:00:00Z" -> "9 nov 2026". */
export function formatShortDate(value: string) {
  return dateFormat.format(new Date(value));
}

/** True when the row was changed more than a minute after it was created. */
export function wasEdited(createdAt: string, updatedAt: string) {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60_000;
}

/** 4.25 -> "4,3" */
export function formatRating(value: number) {
  return value.toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
