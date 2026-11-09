import { chatModel, getGemini, isGeminiRateLimited, visionModel } from "@/lib/gemini";
import { allergenNote, detectAllergens, FOOD_COLUMNS, FOOD_UNREADABLE_MESSAGE, toFoodCard } from "@/lib/foods";
import {
  MAX_IMAGE_BASE64_LENGTH,
  UNREADABLE_MESSAGE,
  type Confidence,
  type FoodApiSuccess,
  type FoodReading,
  type IdentifyApiError,
  type IdentifyApiSuccess,
  type MedicineCard,
  type PackageReading,
} from "@/lib/identify";
import { safeMedicineText } from "@/lib/medicine-safety";
import {
  buildFoodDescriptionPrompt,
  buildGeneralUsePrompt,
  FOOD_READ_PROMPT,
  FOOD_READ_SCHEMA,
  MEDICINE_READ_PROMPT,
  MEDICINE_READ_SCHEMA,
  UNKNOWN_DISH,
  UNKNOWN_INGREDIENT,
} from "@/lib/prompts/identify";
import { getUsage, recordUsage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Schema } from "@google/genai";
import type { AiFeature, Medicine } from "@/types/database";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageMime = (typeof ALLOWED_MIME)[number];
type Image = { data: string; mimeType: ImageMime };
type Supabase = Awaited<ReturnType<typeof createClient>>;
type Quota = { remaining: number; limit: number };
const DATA_URL = /^data:(image\/[a-z]+);base64,/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function fail(status: number, code: IdentifyApiError["code"], error: string, remaining?: number) {
  return Response.json({ error, code, remaining } satisfies IdentifyApiError, { status });
}

export async function POST(request: Request) {
  try {
    return await handleIdentify(request);
  } catch (error) {
    console.error("[api/identify] unexpected error", error);
    return fail(500, "failed", "No pudimos analizar la foto. Intenta de nuevo.");
  }
}

/** Accepts raw base64 or a data URL. The image is only kept in memory. */
function parseImage(value: unknown): Image | null {
  if (typeof value !== "string" || value.length > MAX_IMAGE_BASE64_LENGTH) return null;
  let mimeType: string = "image/jpeg";
  let data = value.trim();
  const prefix = data.match(DATA_URL);
  if (prefix) {
    mimeType = prefix[1];
    data = data.slice(prefix[0].length);
  }
  if (!ALLOWED_MIME.includes(mimeType as ImageMime)) return null;
  if (data.length < 100 || !BASE64.test(data)) return null;
  return { data, mimeType: mimeType as ImageMime };
}

function cleanString(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const json: unknown = JSON.parse(raw);
    return json && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseConfidence(value: unknown): Confidence {
  return ["alta", "media", "baja"].includes(value as string) ? (value as Confidence) : "baja";
}

function parseStringList(value: unknown, max = 6) {
  return Array.isArray(value)
    ? value
        .map((i) => cleanString(i, 80))
        .filter((i): i is string => i !== null)
        .slice(0, max)
    : [];
}

/** Validates Gemini's JSON instead of trusting it. */
function parseReading(raw: string): (PackageReading & { isPackaging: boolean }) | null {
  const json = parseJson(raw);
  if (!json) return null;
  const confidence = parseConfidence(json.confidence);
  const ingredients = parseStringList(json.active_ingredients);
  return {
    isPackaging: json.is_packaging === true,
    brandName: cleanString(json.brand_name, 120),
    activeIngredients: [...new Set(ingredients.map((i) => i.toLowerCase()))],
    concentration: cleanString(json.concentration, 60),
    form: cleanString(json.form, 60),
    confidence,
  };
}

function toCard(m: Medicine): MedicineCard {
  return {
    brandNamePe: m.brand_name_pe,
    activeIngredient: m.active_ingredient,
    presentation: safeMedicineText(m.presentation),
    generalUse: safeMedicineText(m.general_use),
    equivalentCo: safeMedicineText(m.equivalent_co),
    whereToBuy: safeMedicineText(m.where_to_buy),
    warning: m.warning,
    digemidUrl: m.digemid_url,
    sourceName: m.source_name,
    sourceUrl: m.source_url,
    verifiedAt: m.verified_at,
  };
}

/** Validates Gemini's food JSON. Returns null when no dish was recognized. */
function parseFoodReading(raw: string): FoodReading | null {
  const json = parseJson(raw);
  if (!json || json.is_food !== true) return null;
  const dishName = cleanString(json.dish_name, 80)?.toLowerCase();
  const confidence = parseConfidence(json.confidence);
  if (!dishName || confidence === "baja") return null;
  const ingredients = parseStringList(json.main_ingredients).map((i) => i.toLowerCase());
  return { dishName, mainIngredients: [...new Set(ingredients)], confidence };
}

/** Short plain-text answer from the chat model (at most `sentences` sentences), or null. */
async function shortText(prompt: string, unknownMarker: string, sentences: number) {
  try {
    const response = await getGemini().models.generateContent({
      model: chatModel(),
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.2, maxOutputTokens: 600 },
    });
    const text = response.text?.replace(/\*\*|__|^#+\s*/gm, "").replace(/\s+/g, " ").trim();
    if (!text || text.includes(unknownMarker)) return null;
    const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    return parts.slice(0, sentences).join(" ").trim() || null;
  } catch (error) {
    console.error("[api/identify] text generation error", error);
    return null;
  }
}

async function explainGeneralUse(ingredients: string[]) {
  const text = await shortText(buildGeneralUsePrompt(ingredients), UNKNOWN_INGREDIENT, 3);
  // Apply the dose / wording rules.
  return text ? safeMedicineText(text) : null;
}

/**
 * Checks the shared photo quota, then sends the image to Gemini (never stored).
 * Returns Gemini's raw JSON text plus the quota left, or an error Response.
 */
async function readPhoto(
  userId: string,
  feature: AiFeature,
  image: Image,
  instruction: string,
  systemInstruction: string,
  responseSchema: Schema,
): Promise<{ raw: string; quota: Quota } | Response> {
  const usage = await getUsage(userId, feature);
  if (usage.remaining <= 0) {
    return fail(429, "daily_limit", `Ya usaste tus ${usage.limit} fotos de hoy. Vuelve mañana.`, 0);
  }

  let raw: string;
  try {
    const response = await getGemini().models.generateContent({
      model: visionModel(),
      contents: [{ role: "user", parts: [{ inlineData: image }, { text: instruction }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0,
        maxOutputTokens: 1000,
      },
    });
    raw = response.text?.trim() ?? "";
  } catch (error) {
    if (isGeminiRateLimited(error)) {
      return fail(503, "busy", "El asistente está muy ocupado, intenta en un minuto", usage.remaining);
    }
    console.error("[api/identify] Gemini vision error", error);
    return fail(502, "failed", "No pudimos analizar la foto. Intenta de nuevo.", usage.remaining);
  }

  await recordUsage(userId, feature);
  return { raw, quota: { remaining: Math.max(0, usage.remaining - 1), limit: usage.limit } };
}

async function handleIdentify(request: Request) {
  // 1. Session
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail(401, "unauthorized", "Inicia sesión para identificar fotos.");

  // 2. Input
  let body: { kind?: unknown; image?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid", "Solicitud no válida.");
  }
  if (body.kind !== "medicine" && body.kind !== "food") {
    return fail(400, "invalid", "Tipo de foto no válido.");
  }
  const image = parseImage(body.image);
  if (!image) return fail(400, "invalid", "La imagen no es válida o es muy pesada. Prueba con otra foto.");

  return body.kind === "food"
    ? identifyFood(supabase, userId, image)
    : identifyMedicine(supabase, userId, image);
}

async function identifyMedicine(supabase: Supabase, userId: string, image: Image) {
  // 3–4. Daily limit (photos share one quota) and package reading.
  const read = await readPhoto(
    userId,
    "photo_medicine",
    image,
    "Transcribe el texto del empaque de esta foto.",
    MEDICINE_READ_PROMPT,
    MEDICINE_READ_SCHEMA,
  );
  if (read instanceof Response) return read;
  const { raw, quota } = read;

  const parsed = parseReading(raw);
  if (
    !parsed ||
    !parsed.isPackaging ||
    parsed.confidence === "baja" ||
    (!parsed.brandName && parsed.activeIngredients.length === 0)
  ) {
    return Response.json({
      status: "unreadable",
      message: UNREADABLE_MESSAGE,
      ...quota,
    } satisfies IdentifyApiSuccess);
  }
  const { isPackaging: _isPackaging, ...reading } = parsed;
  void _isPackaging;

  // 5. Look it up in our verified table (unaccent + trigram similarity).
  const { data: matches, error: searchError } = await supabase.rpc("search_medicines", {
    p_brand_name: reading.brandName,
    p_active_ingredients: reading.activeIngredients,
    p_limit: 1,
  });
  if (searchError) console.error("[api/identify] search_medicines error", searchError.message);

  const match = matches?.[0];
  if (match) {
    return Response.json({
      status: "verified",
      reading,
      medicine: toCard(match),
      ...quota,
    } satisfies IdentifyApiSuccess);
  }

  // 6. No match: AI general use (validated), shown as "referencial".
  const generalUse = reading.activeIngredients.length
    ? await explainGeneralUse(reading.activeIngredients)
    : null;

  return Response.json({ status: "ai", reading, generalUse, ...quota } satisfies IdentifyApiSuccess);
}

async function identifyFood(supabase: Supabase, userId: string, image: Image) {
  // 3–4. Daily limit (shared with medicines) and dish recognition.
  const read = await readPhoto(
    userId,
    "photo_food",
    image,
    "¿Qué plato o bebida peruana aparece en esta foto?",
    FOOD_READ_PROMPT,
    FOOD_READ_SCHEMA,
  );
  if (read instanceof Response) return read;
  const { raw, quota } = read;

  const reading = parseFoodReading(raw);
  if (!reading) {
    return Response.json({
      status: "unreadable",
      message: FOOD_UNREADABLE_MESSAGE,
      ...quota,
    } satisfies FoodApiSuccess);
  }

  // 5. Look it up in foods by name and keywords (unaccent + trigram similarity).
  const { data: matches, error: searchError } = await supabase
    .rpc("search_foods", { p_name: reading.dishName, p_limit: 1 })
    .select(FOOD_COLUMNS);
  if (searchError) console.error("[api/identify] search_foods error", searchError.message);

  const match = matches?.[0];
  if (match) {
    return Response.json({
      status: "verified",
      reading,
      food: toFoodCard(match),
      ...quota,
    } satisfies FoodApiSuccess);
  }

  // 6. No match: short AI description, shown as "referencial", plus allergen note.
  const description = await shortText(
    buildFoodDescriptionPrompt(reading.dishName, reading.mainIngredients),
    UNKNOWN_DISH,
    2,
  );
  const note = allergenNote(
    detectAllergens(reading.dishName, reading.mainIngredients.join(" "), description),
  );

  return Response.json({
    status: "ai",
    reading,
    description,
    allergenNote: note,
    ...quota,
  } satisfies FoodApiSuccess);
}
