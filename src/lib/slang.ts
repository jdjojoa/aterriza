import type { SlangTerm } from "@/types/database";

/** Slang categories, in the order the filter chips show them. Keys match slang_terms.category. */
export const SLANG_CATEGORIES = [
  { value: "expresiones", label: "Expresiones" },
  { value: "personas", label: "Personas" },
  { value: "comida", label: "Comida" },
  { value: "transporte", label: "Transporte" },
  { value: "compras", label: "Dinero y compras" },
  { value: "estudio", label: "Estudio y trabajo" },
  { value: "lugares", label: "Lugares" },
  { value: "ropa", label: "Ropa" },
] as const;

export function slangCategoryLabel(category: string | null) {
  if (!category) return "General";
  return SLANG_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

/** Columns the Jerga screen needs. */
export const SLANG_COLUMNS =
  "id, term, meaning, equivalent_co, example, category, source_name, source_url, verified_at" as const;

export type SlangItem = Pick<
  SlangTerm,
  | "id"
  | "term"
  | "meaning"
  | "equivalent_co"
  | "example"
  | "category"
  | "source_name"
  | "source_url"
  | "verified_at"
>;
