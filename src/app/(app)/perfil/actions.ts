"use server";

import { refresh } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { isOriginCountry } from "@/lib/countries";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  status: "idle" | "saved" | "error";
  message: string | null;
};

const MAX_NAME_LENGTH = 80;

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim().replace(/\s+/g, " ");
  const origin = formData.get("origin_country");

  if (!fullName) {
    return { status: "error", message: "Escribe tu nombre." };
  }
  if (fullName.length > MAX_NAME_LENGTH) {
    return { status: "error", message: `Usa como máximo ${MAX_NAME_LENGTH} caracteres.` };
  }
  if (!isOriginCountry(origin)) {
    return { status: "error", message: "Elige tu país de origen." };
  }

  // Re-checks the session: Server Actions are public endpoints.
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, origin_country: origin })
    .eq("id", profile.id);

  if (error) {
    console.error("profile: update failed", error.message);
    return { status: "error", message: "No pudimos guardar los cambios. Inténtalo de nuevo." };
  }

  // Re-render the header menu and other server UI with the new values.
  refresh();
  return { status: "saved", message: "Cambios guardados." };
}
