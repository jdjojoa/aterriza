"use server";

import { refresh } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import {
  MAX_TIPS_PER_DAY,
  TIP_MAX_LENGTH,
  TIP_MIN_LENGTH,
  isTipCategory,
  type TipCategory,
} from "@/lib/community";
import { createClient } from "@/lib/supabase/server";

export type TipFormState = {
  status: "idle" | "saved" | "error";
  message: string | null;
  /** Bumped on success so the form can reset its fields. */
  savedAt: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates the tip fields; returns an error message or the clean values. */
type ParsedTip =
  | { ok: false; error: string }
  | { ok: true; category: TipCategory; body: string };

function parseTip(formData: FormData): ParsedTip {
  const category = formData.get("category");
  const body = String(formData.get("body") ?? "").trim().replace(/[ \t]+/g, " ");
  if (!isTipCategory(category)) return { ok: false, error: "Elige una categoría." };
  if (body.length < TIP_MIN_LENGTH) return { ok: false, error: `Escribe al menos ${TIP_MIN_LENGTH} caracteres.` };
  if (body.length > TIP_MAX_LENGTH) return { ok: false, error: `Usa como máximo ${TIP_MAX_LENGTH} caracteres.` };
  return { ok: true, category, body };
}

export async function createTip(prev: TipFormState, formData: FormData): Promise<TipFormState> {
  const fail = (message: string): TipFormState => ({ ...prev, status: "error", message });
  const parsed = parseTip(formData);
  if (!parsed.ok) return fail(parsed.error);
  const { category, body } = parsed;

  // Re-checks the session: Server Actions are public endpoints.
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // Tips go live instantly: limit how many a user publishes per day.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("tips")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .gte("created_at", since);
  if (countError) {
    console.error("[aportes] count failed", countError.message);
    return fail("No pudimos publicar tu aporte. Inténtalo de nuevo.");
  }
  if ((count ?? 0) >= MAX_TIPS_PER_DAY) {
    return fail(`Puedes publicar hasta ${MAX_TIPS_PER_DAY} aportes al día. Vuelve a intentarlo mañana.`);
  }

  // RLS forces user_id = auth.uid(); the DB trigger sets status = 'approved'.
  const { error } = await supabase.from("tips").insert({ category, body, user_id: profile.id });
  if (error) {
    console.error("[aportes] insert failed", error.message);
    return fail("No pudimos publicar tu aporte. Inténtalo de nuevo.");
  }

  refresh();
  return {
    status: "saved",
    message: "¡Gracias! Tu aporte ya está publicado.",
    savedAt: Date.now(),
  };
}

export type TipActionResult = { status: "done" | "error"; message: string };

/**
 * Author edits their own tip. The status does not change: a published tip
 * stays published (0009_simplify_verification.sql protects moderation fields).
 */
export async function updateTip(tipId: string, formData: FormData): Promise<TipActionResult> {
  const fail = (message: string): TipActionResult => ({ status: "error", message });
  if (!UUID.test(tipId)) return fail("Solicitud no válida.");
  const parsed = parseTip(formData);
  if (!parsed.ok) return fail(parsed.error);

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // RLS (tips_update_own) limits this to the author's rows; the trigger keeps the status.
  const { data, error } = await supabase
    .from("tips")
    .update({ category: parsed.category, body: parsed.body })
    .eq("id", tipId)
    .eq("user_id", profile.id)
    .select("id");
  if (error || !data?.length) {
    console.error("[aportes] update failed", error?.message);
    return fail("No pudimos guardar los cambios. Inténtalo de nuevo.");
  }

  refresh();
  return { status: "done", message: "Cambios guardados." };
}

/** Author deletes their own tip (RLS: tips_delete_own). */
export async function deleteTip(tipId: string): Promise<TipActionResult> {
  if (!UUID.test(tipId)) return { status: "error", message: "Solicitud no válida." };
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tips")
    .delete()
    .eq("id", tipId)
    .eq("user_id", profile.id)
    .select("id");
  if (error || !data?.length) {
    console.error("[aportes] delete failed", error?.message);
    return { status: "error", message: "No pudimos eliminar el aporte. Inténtalo de nuevo." };
  }
  refresh();
  return { status: "done", message: "Aporte eliminado." };
}
