import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";

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
