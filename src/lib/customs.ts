import type { IconName } from "@/components/icons/Icon";
import type { Custom } from "@/types/database";

/** Custom categories, in the order the screen shows them. Keys match customs.category. */
export const CUSTOM_CATEGORIES: { value: string; label: string; icon: IconName }[] = [
  { value: "saludo", label: "Saludo", icon: "hand" },
  { value: "comida", label: "Comida", icon: "utensils" },
  { value: "transporte", label: "Transporte", icon: "bus" },
  { value: "horarios", label: "Horarios", icon: "clock" },
  { value: "propinas", label: "Propinas", icon: "currency" },
  { value: "seguridad", label: "Seguridad", icon: "shield" },
];

export function customCategory(category: string | null) {
  return (
    CUSTOM_CATEGORIES.find((c) => c.value === category) ?? {
      value: category ?? "general",
      label: category ?? "General",
      icon: "info" as IconName,
    }
  );
}

/** Columns the Costumbres screen needs. */
export const CUSTOM_COLUMNS =
  "id, title, body, category, source_name, source_url, verified_at" as const;

export type CustomItem = Pick<
  Custom,
  "id" | "title" | "body" | "category" | "source_name" | "source_url" | "verified_at"
>;
