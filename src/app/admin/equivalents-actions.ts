"use server";

/**
 * Admin Server Actions for public.equivalents (one row per content + country).
 * Re-check the admin role and write with the user's session: RLS
 * (public.is_admin()) enforces the permission again.
 */
import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin, todayInLima } from "@/lib/admin/auth";
import { isOriginCountry } from "@/lib/countries";
import { isSafeMedicineText } from "@/lib/medicine-safety";
import { createClient } from "@/lib/supabase/server";
import type { EquivalentContentType } from "@/types/database";

export type EquivalentFormState = {
  status: "idle" | "saved" | "error";
  message: string | null;
  /** Bumped on success so the form clears. */
  version: number;
};

const CONTENT_TYPES = ["medicine", "food", "slang"] as const satisfies readonly EquivalentContentType[];

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const schema = z.object({
  content_type: z.enum(CONTENT_TYPES),
  content_id: z.guid(),
  country_code: z.string().refine(isOriginCountry, "Elige un país."),
  equivalent_text: z.string().trim().min(1, "Escribe la equivalencia.").max(300, "Usa como máximo 300 caracteres."),
  brand_names: z
    .string()
    .transform((v) => [...new Set(v.split(",").map((b) => b.trim()).filter(Boolean))])
    .refine((list) => list.length <= 20 && list.every((b) => b.length <= 80), "Usa como máximo 20 marcas de 80 caracteres."),
  source_name: z.string().trim().max(200, "Usa como máximo 200 caracteres."),
  source_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || isHttpUrl(v), "Escribe un enlace completo que empiece por https://"),
  verify: z.boolean(),
});

/** Creates or replaces the equivalent of one content row for one country. */
export async function saveEquivalent(prev: EquivalentFormState, formData: FormData): Promise<EquivalentFormState> {
  await requireAdmin();
  const fail = (message: string): EquivalentFormState => ({ ...prev, status: "error", message });
  const parsed = schema.safeParse({
    content_type: formData.get("content_type"),
    content_id: formData.get("content_id"),
    country_code: formData.get("country_code"),
    equivalent_text: String(formData.get("equivalent_text") ?? ""),
    brand_names: String(formData.get("brand_names") ?? ""),
    source_name: String(formData.get("source_name") ?? ""),
    source_url: String(formData.get("source_url") ?? ""),
    verify: formData.get("verify") === "on",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revisa los campos.");
  const v = parsed.data;

  // Medicine rules: no doses, no forbidden words, "equivalente referencial".
  if (v.content_type === "medicine" && ![v.equivalent_text, ...v.brand_names].every(isSafeMedicineText)) {
    return fail("Quita dosis, frecuencias o palabras prohibidas. Usa «equivalente referencial».");
  }
  const hasSource = Boolean(v.source_name && v.source_url);
  if (v.verify && !hasSource) return fail("Para marcarla como verificada completa el nombre y el enlace de la fuente.");

  const supabase = await createClient();
  const { error } = await supabase.from("equivalents").upsert(
    {
      content_type: v.content_type,
      content_id: v.content_id,
      country_code: v.country_code,
      equivalent_text: v.equivalent_text,
      brand_names: v.content_type === "medicine" ? v.brand_names : [],
      source_name: v.source_name || null,
      source_url: v.source_url || null,
      verified_at: v.verify ? todayInLima() : null,
    },
    { onConflict: "content_type,content_id,country_code" },
  );
  if (error) {
    console.error("[admin] equivalent save failed", error.message);
    return fail(error.code === "23514" ? "Los datos no cumplen las reglas de la base de datos." : "No pudimos guardarla.");
  }
  refresh();
  return { status: "saved", message: "Equivalencia guardada.", version: prev.version + 1 };
}

export async function deleteEquivalent(id: string): Promise<{ status: "done" | "error"; message: string }> {
  await requireAdmin();
  if (!z.guid().safeParse(id).success) return { status: "error", message: "Solicitud no válida." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("equivalents").delete().eq("id", id).select("id");
  if (error || !data?.length) {
    console.error("[admin] equivalent delete failed", error?.message);
    return { status: "error", message: "No pudimos eliminarla." };
  }
  refresh();
  return { status: "done", message: "Equivalencia eliminada." };
}
