import "server-only";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

/**
 * Admin gate for /admin pages and every admin Server Action.
 * The proxy redirect is only UX; this check (plus RLS) is the real guard.
 */
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/inicio");
  return profile;
}

/** Today's date in Piura (YYYY-MM-DD), for verified_at. */
export function todayInLima() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
