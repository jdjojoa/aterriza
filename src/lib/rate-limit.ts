import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiCallStatus, AiFeature } from "@/types/database";

/** Daily AI quota per user and feature. Days start at 00:00 in Lima. */
export const DAILY_LIMITS: Record<AiFeature, number> = {
  chat: 20,
  photo_medicine: 5,
  photo_food: 5,
};

/** Photo features share one quota ("fotos: 5"). */
const QUOTA_GROUPS: Record<AiFeature, AiFeature[]> = {
  chat: ["chat"],
  photo_medicine: ["photo_medicine", "photo_food"],
  photo_food: ["photo_medicine", "photo_food"],
};

const TIME_ZONE = "America/Lima";
// Peru has no daylight saving time: Lima is always UTC-5.
const LIMA_OFFSET = "-05:00";

/** ISO timestamp of today's 00:00 in Lima. */
export function startOfLimaDay(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "2026-11-09"
  return new Date(`${day}T00:00:00${LIMA_OFFSET}`).toISOString();
}

export type Usage = { used: number; limit: number; remaining: number };

/**
 * How many AI actions the user made today for this feature. Only successful
 * user actions count: follow-up calls and failures are logged but free.
 */
export async function getUsage(userId: string, feature: AiFeature): Promise<Usage> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("feature", QUOTA_GROUPS[feature])
    .eq("status", "ok")
    .eq("counts_for_user", true)
    .gte("created_at", startOfLimaDay());
  // HEAD requests can come back without an error body: a null count is a failure too.
  if (error || count === null) {
    throw new Error(`ai_usage count failed: ${error?.message ?? "no count returned"}`);
  }

  const used = count;
  const limit = DAILY_LIMITS[feature];
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export type GeminiCall = {
  userId: string;
  feature: AiFeature;
  model: string;
  status: AiCallStatus;
  /** true = this call is the user's action and counts toward their daily limit. */
  countsForUser: boolean;
};

/** Records one real Gemini call. Service role only: users cannot write ai_usage (RLS). */
export async function recordGeminiCall(call: GeminiCall) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("ai_usage").insert({
    user_id: call.userId,
    feature: call.feature,
    model: call.model,
    status: call.status,
    counts_for_user: call.countsForUser,
  });
  if (error) throw new Error(`ai_usage insert failed: ${error.message}`);
}
