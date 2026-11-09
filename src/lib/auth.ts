import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Current user's profile, read once per request (Data Access Layer).
 * Reads cookies, so call it only inside a <Suspense> boundary or a Server Action.
 * Redirects to the landing page when there is no session.
 */
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, origin_country, destination_country, destination_city, onboarded",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!profile) redirect("/");

  return profile;
});

export type CurrentProfile = Awaited<ReturnType<typeof getCurrentProfile>>;

/** "Ana María Pérez" -> "Ana". Falls back to a friendly default. */
export function firstName(fullName: string | null) {
  return fullName?.trim().split(/\s+/)[0] || "viajero";
}
