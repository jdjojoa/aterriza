import { chatModel, getGemini, isGeminiRateLimited, visionModel } from "@/lib/gemini";
import {
  MAX_IMAGE_BASE64_LENGTH,
  UNREADABLE_MESSAGE,
  type Confidence,
  type IdentifyApiError,
  type IdentifyApiSuccess,
  type MedicineCard,
  type PackageReading,
} from "@/lib/identify";
import { safeMedicineText } from "@/lib/medicine-safety";
import {
  buildGeneralUsePrompt,
  MEDICINE_READ_PROMPT,
  MEDICINE_READ_SCHEMA,
  UNKNOWN_INGREDIENT,
} from "@/lib/prompts/identify";
import { getUsage, recordUsage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Medicine } from "@/types/database";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageMime = (typeof ALLOWED_MIME)[number];
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
function parseImage(value: unknown): { data: string; mimeType: ImageMime } | null {
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

/** Validates Gemini's JSON instead of trusting it. */
function parseReading(raw: string): (PackageReading & { isPackaging: boolean }) | null {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;
  const confidence: Confidence = ["alta", "media", "baja"].includes(json.confidence as string)
    ? (json.confidence as Confidence)
    : "baja";
  const ingredients = Array.isArray(json.active_ingredients)
    ? json.active_ingredients
        .map((i) => cleanString(i, 80))
        .filter((i): i is string => i !== null)
        .slice(0, 6)
    : [];
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

async function explainGeneralUse(ingredients: string[]) {
  try {
    const response = await getGemini().models.generateContent({
      model: chatModel(),
      contents: [{ role: "user", parts: [{ text: buildGeneralUsePrompt(ingredients) }] }],
      config: { temperature: 0.2, maxOutputTokens: 600 },
    });
    const text = response.text?.replace(/\*\*|__|^#+\s*/gm, "").replace(/\s+/g, " ").trim();
    if (!text || text.includes(UNKNOWN_INGREDIENT)) return null;
    // Keep at most 3 sentences, then apply the dose / wording rules.
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    return safeMedicineText(sentences.slice(0, 3).join(" ").trim());
  } catch (error) {
    console.error("[api/identify] general use error", error);
    return null;
  }
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
  if (body.kind === "food") {
    return fail(400, "invalid", "La identificación de comidas estará disponible pronto.");
  }
  if (body.kind !== "medicine") return fail(400, "invalid", "Tipo de foto no válido.");
  const image = parseImage(body.image);
  if (!image) return fail(400, "invalid", "La imagen no es válida o es muy pesada. Prueba con otra foto.");

  // 3. Daily limit (photos share one quota)
  const usage = await getUsage(userId, "photo_medicine");
  if (usage.remaining <= 0) {
    return fail(429, "daily_limit", `Ya usaste tus ${usage.limit} fotos de hoy. Vuelve mañana.`, 0);
  }

  // 4. Read the package. The image is sent to Gemini and never stored.
  let raw: string;
  try {
    const response = await getGemini().models.generateContent({
      model: visionModel(),
      contents: [
        {
          role: "user",
          parts: [{ inlineData: image }, { text: "Transcribe el texto del empaque de esta foto." }],
        },
      ],
      config: {
        systemInstruction: MEDICINE_READ_PROMPT,
        responseMimeType: "application/json",
        responseSchema: MEDICINE_READ_SCHEMA,
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

  await recordUsage(userId, "photo_medicine");
  const quota = { remaining: Math.max(0, usage.remaining - 1), limit: usage.limit };

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
