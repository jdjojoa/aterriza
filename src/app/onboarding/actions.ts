"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { DESTINATION } from "@/lib/countries";
import { parseOriginForm } from "@/lib/peru-locations";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error: string | null };

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const origin = await parseOriginForm(formData);
  if (!origin.ok) return { error: origin.error };

  // Re-checks the session: Server Actions are public endpoints.
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      ...origin.value,
      destination_country: DESTINATION.country,
      destination_city: DESTINATION.city,
      onboarded: true,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("onboarding: update failed", error.message);
    return { error: "No pudimos guardar tus datos. Inténtalo de nuevo." };
  }

  redirect("/inicio");
}
