import "server-only";
import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Gemini free-tier meter for /admin. An estimate built from ai_usage (one row
 * per real Gemini call); the official numbers live in Google AI Studio.
 * Google resets requests-per-day at midnight Pacific time.
 */
const PACIFIC = "America/Los_Angeles";
const HOUR = 3_600_000;
const DEFAULT_RPD = 500;

/** UTC offset of `tz` at `date`, in minutes (e.g. -480 for PST). */
function offsetMinutes(date: Date, tz: string) {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0; // "GMT" = UTC
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

/** 00:00 of the day `date` falls in, in `tz`. DST never switches at midnight there. */
function zonedMidnight(date: Date, tz: string) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .split("-")
    .map(Number);
  const utc = Date.UTC(y, m - 1, d);
  // Two passes: the offset at the guessed instant is the one at that midnight.
  let t = utc - offsetMinutes(new Date(utc), tz) * 60_000;
  t = utc - offsetMinutes(new Date(t), tz) * 60_000;
  return new Date(t);
}

/** Current Google quota day: [start, reset). */
export function pacificQuotaDay(now = new Date()) {
  const start = zonedMidnight(now, PACIFIC);
  // 26 h after a midnight is always inside the next day (days last 23–25 h).
  const reset = zonedMidnight(new Date(start.getTime() + 26 * HOUR), PACIFIC);
  return { start, reset };
}

function rpd(name: string) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_RPD;
}

export type QuotaMeter = {
  model: string;
  /** "chat" | "vision" | both when chat and photos share the model. */
  uses: ("chat" | "vision")[];
  limit: number;
  /** Calls Google processed (ok + error). 429s were rejected, so they are not counted. */
  used: number;
  remaining: number;
  /** 0–100, what is LEFT. */
  percentLeft: number;
  chatCalls: number;
  photoCalls: number;
  rateLimited: number;
  /** Calls per hour since the quota day started (all statuses). */
  hourly: number[];
};

export type GeminiQuota = {
  meters: QuotaMeter[];
  start: Date;
  reset: Date;
  /** When the numbers were read. */
  now: Date;
};

/**
 * Today's usage per model. Admin only: checks the role here and again in the
 * database (admin_ai_usage_summary raises for non-admins).
 * Returns null when the query fails (e.g. migration 0013 not run yet).
 */
export async function getGeminiQuota(): Promise<GeminiQuota | null> {
  await requireAdmin();
  const now = new Date();
  const { start, reset } = pacificQuotaDay(now);

  const chatModel = process.env.GEMINI_CHAT_MODEL || "chat";
  const visionModel = process.env.GEMINI_VISION_MODEL || "vision";
  // Same model = same daily quota: one meter with GEMINI_RPD_CHAT.
  const configs =
    chatModel === visionModel
      ? [{ model: chatModel, uses: ["chat", "vision"] as const, limit: rpd("GEMINI_RPD_CHAT") }]
      : [
          { model: chatModel, uses: ["chat"] as const, limit: rpd("GEMINI_RPD_CHAT") },
          { model: visionModel, uses: ["vision"] as const, limit: rpd("GEMINI_RPD_VISION") },
        ];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ai_usage_summary", {
    p_since: start.toISOString(),
  });
  if (error || !data) {
    console.error("[admin] ai usage summary error", error?.message);
    return null;
  }

  const hours = Math.round((reset.getTime() - start.getTime()) / HOUR);
  const meters = configs.map(({ model, uses, limit }): QuotaMeter => {
    const meter = {
      model,
      uses: [...uses],
      limit,
      used: 0,
      chatCalls: 0,
      photoCalls: 0,
      rateLimited: 0,
      hourly: Array<number>(hours).fill(0),
    };
    // Rows from before 0013 have no model: they used the chat model.
    for (const row of data.filter((r) => (r.model ?? chatModel) === model)) {
      const calls = Number(row.calls);
      const index = Math.floor((new Date(row.hour).getTime() - start.getTime()) / HOUR);
      if (index >= 0 && index < hours) meter.hourly[index] += calls;
      if (row.status === "rate_limited") {
        meter.rateLimited += calls;
        continue;
      }
      meter.used += calls;
      if (row.feature === "chat") meter.chatCalls += calls;
      else meter.photoCalls += calls;
    }
    const remaining = Math.max(0, limit - meter.used);
    return { ...meter, remaining, percentLeft: (remaining / limit) * 100 };
  });

  return { meters, start, reset, now };
}
