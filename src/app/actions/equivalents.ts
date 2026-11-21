"use server";

import { refresh } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { MAX_TIPS_PER_DAY, TIP_MAX_LENGTH } from "@/lib/community";
import { countryName } from "@/lib/countries";
import { CONTENT_TYPE_LABELS, SUGGESTION_TIP_CATEGORY } from "@/lib/equivalents";
import { profileOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import type { EquivalentContentType } from "@/types/database";

export type SuggestionState = { status: "idle" | "saved" | "error"; message: string | null };

const MIN_LENGTH = 2;
const MAX_LENGTH = 200;
const CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABELS) as EquivalentContentType[];

/**
 * "Sugerir una": publishes a community tip (category "equivalencia") with the
 * equivalent the student knows for their own country. The team reviews it
 * and, if it is right, adds it from /admin. Same daily limit as other tips.
 */
export async function suggestEquivalent(
  _prev: SuggestionState,
  formData: FormData,
): Promise<SuggestionState> {
  const fail = (message: string): SuggestionState => ({ status: "error", message });
  const type = formData.get("content_type");
  const label = String(formData.get("content_label") ?? "").trim().slice(0, 120);
  const text = String(formData.get("text") ?? "").trim().replace(/\s+/g, " ");
  if (!CONTENT_TYPES.includes(type as EquivalentContentType) || !label) return fail("Solicitud no válida.");
  if (text.length < MIN_LENGTH) return fail("Escribe cómo se dice o cómo se llama en tu país.");
  if (text.length > MAX_LENGTH) return fail(`Usa como máximo ${MAX_LENGTH} caracteres.`);
  if (type === "medicine" && /sustitu|intercambiab/i.test(text)) {
    return fail("Usa «equivalente referencial» en lugar de esas palabras.");
  }

  // Re-checks the session: Server Actions are public endpoints.
  const profile = await getCurrentProfile();
  const origin = profileOrigin(profile);
  if (origin.type !== "internacional" || !origin.country) {
    return fail("Las equivalencias son para estudiantes que vienen de otro país.");
  }

  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("tips")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .gte("created_at", since);
  if (countError) return fail("No pudimos enviar tu sugerencia. Inténtalo de nuevo.");
  if ((count ?? 0) >= MAX_TIPS_PER_DAY) {
    return fail(`Puedes publicar hasta ${MAX_TIPS_PER_DAY} aportes al día. Vuelve a intentarlo mañana.`);
  }

  const typeLabel = CONTENT_TYPE_LABELS[type as EquivalentContentType];
  const body = `Equivalencia en ${countryName(origin.country)} para el ${typeLabel} «${label}»: ${text}`.slice(
    0,
    TIP_MAX_LENGTH,
  );
  const { error } = await supabase
    .from("tips")
    .insert({ category: SUGGESTION_TIP_CATEGORY, body, user_id: profile.id });
  if (error) {
    console.error("[equivalents] suggestion failed", error.message);
    return fail("No pudimos enviar tu sugerencia. Inténtalo de nuevo.");
  }
  refresh();
  return { status: "saved", message: "¡Gracias! Publicamos tu sugerencia en Aportes." };
}
