"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { ACCEPT_TERMS_ERROR, acceptedTerms } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";

export type AcceptTermsState = { error: string | null };

/** Only same-site app paths, never an external URL. */
function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^\/(?!\/)[\w\-/]*$/.test(value) ? value : "/inicio";
}

export async function acceptTerms(_prev: AcceptTermsState, formData: FormData): Promise<AcceptTermsState> {
  if (!acceptedTerms(formData)) return { error: ACCEPT_TERMS_ERROR };

  // Re-checks the session: Server Actions are public endpoints.
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    // The database stamps the real date (trigger stamp_terms_accepted_at).
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (error) {
    console.error("accept-terms: update failed", error.message);
    return { error: "No pudimos guardar tu respuesta. Inténtalo de nuevo." };
  }
  redirect(safeNext(formData.get("next")));
}
