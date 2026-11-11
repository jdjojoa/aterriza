import "server-only";
import { ApiError, GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { recordGeminiCall } from "@/lib/rate-limit";
import type { AiFeature } from "@/types/database";

/**
 * Gemini client. Server only: GEMINI_API_KEY must never reach the browser.
 * Import this module only from route handlers in src/app/api/**.
 */
function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

let client: GoogleGenAI | null = null;

/** Lazily created so `next build` does not need the secret. */
export function getGemini() {
  client ??= new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  return client;
}

export const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? "";
export const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL ?? "";

export function chatModel() {
  return requireEnv("GEMINI_CHAT_MODEL");
}

export function visionModel() {
  return requireEnv("GEMINI_VISION_MODEL");
}

/** True when Gemini answered 429 (quota or rate limit exceeded). */
export function isGeminiRateLimited(error: unknown) {
  return error instanceof ApiError && error.status === 429;
}

type CallMeta = {
  userId: string;
  feature: AiFeature;
  /** true = the user's action (counts toward their daily limit); false = follow-up call. */
  countsForUser: boolean;
};

/**
 * generateContent + one ai_usage row per real call (ok, error or rate_limited),
 * for the free-tier meter in /admin.
 * Logging a failed call never hides the Gemini error. Logging a successful
 * user action must work (it enforces the daily limit); a follow-up only logs.
 */
export async function generateTracked(params: GenerateContentParameters, meta: CallMeta) {
  const record = (status: "ok" | "error" | "rate_limited") =>
    recordGeminiCall({ ...meta, model: params.model, status });

  let response;
  try {
    response = await getGemini().models.generateContent(params);
  } catch (error) {
    await record(isGeminiRateLimited(error) ? "rate_limited" : "error").catch((e) =>
      console.error("[gemini] could not log failed call", e),
    );
    throw error;
  }

  if (meta.countsForUser) {
    await record("ok");
  } else {
    await record("ok").catch((e) => console.error("[gemini] could not log call", e));
  }
  return response;
}
