"use server";

import { refresh } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import {
  MAX_PENDING_TIPS,
  TIP_MAX_LENGTH,
  TIP_MIN_LENGTH,
  isTipCategory,
} from "@/lib/community";
import { createClient } from "@/lib/supabase/server";

export type TipFormState = {
  status: "idle" | "saved" | "error";
  message: string | null;
  /** Bumped on success so the form can reset its fields. */
  savedAt: number;
};

export async function createTip(prev: TipFormState, formData: FormData): Promise<TipFormState> {
  const category = formData.get("category");
  const body = String(formData.get("body") ?? "").trim().replace(/[ \t]+/g, " ");
  const fail = (message: string): TipFormState => ({ ...prev, status: "error", message });

  if (!isTipCategory(category)) return fail("Elige una categoría.");
  if (body.length < TIP_MIN_LENGTH) return fail(`Escribe al menos ${TIP_MIN_LENGTH} caracteres.`);
  if (body.length > TIP_MAX_LENGTH) return fail(`Usa como máximo ${TIP_MAX_LENGTH} caracteres.`);

  // Re-checks the session: Server Actions are public endpoints.
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("tips")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("status", "pending");
  if (countError) {
    console.error("[aportes] count failed", countError.message);
    return fail("No pudimos enviar tu aporte. Inténtalo de nuevo.");
  }
  if ((count ?? 0) >= MAX_PENDING_TIPS) {
    return fail(
      `Tienes ${MAX_PENDING_TIPS} aportes pendientes. Espera a que el equipo los revise antes de enviar más.`,
    );
  }

  // RLS forces user_id = auth.uid() and status = 'pending'.
  const { error } = await supabase.from("tips").insert({ category, body, user_id: profile.id });
  if (error) {
    console.error("[aportes] insert failed", error.message);
    return fail("No pudimos enviar tu aporte. Inténtalo de nuevo.");
  }

  refresh();
  return {
    status: "saved",
    message: "¡Gracias! Tu aporte quedó pendiente de revisión.",
    savedAt: Date.now(),
  };
}
