import type { Content } from "@google/genai";
import {
  MAX_MESSAGE_LENGTH,
  conversationTitle,
  type ChatApiError,
  type ChatApiSuccess,
} from "@/lib/chat";
import { buildChatContext, resolveCitations } from "@/lib/chat-context";
import { countryName } from "@/lib/countries";
import { chatModel, generateTracked, isGeminiRateLimited } from "@/lib/gemini";
import { enforceMedicineRules, MEDICINE_TOPIC } from "@/lib/medicine-safety";
import { buildChatSystemPrompt, offTopicReply } from "@/lib/prompts/chat";
import { getUsage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const HISTORY_SIZE = 6;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, code: ChatApiError["code"], error: string, remaining?: number) {
  return Response.json({ error, code, remaining } satisfies ChatApiError, { status });
}

/** Project rule: never "sustituto" / "intercambiable" in medicine answers. */
function enforceWording(text: string) {
  return text
    .replace(/\bsustitut[oa]s\b|\bintercambiables\b/gi, "equivalentes referenciales")
    .replace(/\bsustitut[oa]\b|\bintercambiable\b/gi, "equivalente referencial")
    .replace(/\*\*|__|^#+\s*/gm, ""); // plain text: drop stray Markdown
}

// "S/ 3", "S/. 2.50", "3 soles", "5 a 6 soles", "10 mil pesos", "2 dólares", "1 USD", "$5"…
const MONEY =
  /S\/\.?\s?\d|\d+(?:[.,]\d+)?(?:\s*(?:a|y|-|–)\s*\d+(?:[.,]\d+)?)?\s*(?:mil\s+)?(?:soles?|pesos?|d[oó]lares?|usd|pen|cop|lucas?)\b|\$\s?\d/i;
const NO_PRICE =
  "No tengo un precio verificado. Te recomiendo preguntar y acordar el precio antes de subir o comprar.";

/**
 * Project rule: no money amounts without a source. Drop every sentence that
 * contains an amount unless that same sentence cites a context row ([F1], [C1]…).
 * Runs before resolveCitations, while the markers are still [F1]/[C1].
 */
const CITATION = /\[(?:F|C)\d+\]/;
const unsourcedMoney = (sentence: string) => MONEY.test(sentence) && !CITATION.test(sentence);

function stripUnsourcedPrices(text: string) {
  if (!MONEY.test(text)) return text;
  let removed = false;
  const kept = text
    .split("\n")
    .map((line) =>
      line
        // Split only before a new sentence, so "S/. 10" stays in one piece.
        .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡-])/)
        .filter((sentence) => {
          const drop = unsourcedMoney(sentence);
          removed ||= drop;
          return !drop;
        })
        .join(" "),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!removed) return text;
  if (kept.includes("No tengo un precio verificado")) return kept;
  return kept ? `${NO_PRICE}\n\n${kept}` : NO_PRICE;
}

/** The off-topic sentence must stand alone; drop it when appended to a real answer. */
function stripStrayOffTopic(text: string, city: string) {
  const sentence = offTopicReply(city);
  if (text === sentence || !text.includes(sentence)) return text;
  const rest = text.replace(sentence, "").trim();
  return rest || sentence;
}

export async function POST(request: Request) {
  try {
    return await handleChat(request);
  } catch (error) {
    console.error("[api/chat] unexpected error", error);
    return fail(500, "failed", "No pudimos responder ahora. Intenta de nuevo.");
  }
}

async function handleChat(request: Request) {
  // 1. Session
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail(401, "unauthorized", "Inicia sesión para usar el chat.");

  // 2. Input
  let message: unknown;
  let conversationId: unknown;
  try {
    ({ message, conversation_id: conversationId } = await request.json());
  } catch {
    return fail(400, "invalid", "Mensaje no válido.");
  }
  // null/absent = new conversation, created once the answer is ready.
  if (conversationId != null && (typeof conversationId !== "string" || !UUID.test(conversationId))) {
    return fail(400, "invalid", "Conversación no válida.");
  }
  if (typeof message !== "string" || !message.trim()) {
    return fail(400, "invalid", "Escribe una pregunta.");
  }
  message = message.trim();
  const text = message as string;
  if (text.length > MAX_MESSAGE_LENGTH) {
    return fail(400, "invalid", `Tu pregunta puede tener hasta ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  // 3. Conversation (RLS: only the user's own) and daily limit, which counts
  // every conversation of the user (ai_usage is per user).
  let conversation: { id: string; title: string } | null = null;
  if (conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return fail(404, "invalid", "Esta conversación ya no existe. Empieza un chat nuevo.");
    conversation = data;
  }

  const usage = await getUsage(userId, "chat");
  if (usage.remaining <= 0) {
    return fail(
      429,
      "daily_limit",
      `Ya usaste tus ${usage.limit} consultas de hoy. Vuelve mañana.`,
      0,
    );
  }

  // 4. Profile, history and context (in parallel)
  const [{ data: profile }, { data: history }, context] = await Promise.all([
    supabase
      .from("profiles")
      .select("origin_country, destination_country, destination_city")
      .eq("id", userId)
      .maybeSingle(),
    conversation
      ? supabase
          .from("chat_messages")
          .select("role, content")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(HISTORY_SIZE)
      : Promise.resolve({ data: [] as { role: string; content: string }[] }),
    buildChatContext(supabase, text),
  ]);

  const city = profile?.destination_city ?? "Piura";
  const systemInstruction = buildChatSystemPrompt({
    origin: countryName(profile?.origin_country ?? "CO"),
    city,
    country: countryName(profile?.destination_country ?? "PE"),
  });

  const past: Content[] = (history ?? []).reverse().map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  // Gemini expects the conversation to start with a user turn.
  while (past[0]?.role === "model") past.shift();

  const contents: Content[] = [
    ...past,
    {
      role: "user",
      parts: [{ text: `${context.block}\n\nPREGUNTA DEL USUARIO:\n${text}` }],
    },
  ];

  // 5. Gemini
  const askedAt = new Date();
  let raw: string;
  try {
    // Logs the call in ai_usage (also the user's daily count).
    const response = await generateTracked(
      {
        model: chatModel(),
        contents,
        config: { systemInstruction, temperature: 0.4, maxOutputTokens: 800 },
      },
      { userId, feature: "chat", countsForUser: true },
    );
    raw = response.text?.trim() ?? "";
  } catch (error) {
    if (isGeminiRateLimited(error)) {
      return fail(503, "busy", "El asistente está muy ocupado, intenta en un minuto", usage.remaining);
    }
    console.error("[api/chat] Gemini error", error);
    return fail(502, "failed", "No pudimos responder ahora. Intenta de nuevo.", usage.remaining);
  }
  if (!raw) {
    return fail(502, "failed", "No pudimos responder ahora. Intenta de nuevo.", usage.remaining);
  }

  let cleaned = stripUnsourcedPrices(stripStrayOffTopic(enforceWording(raw), city));
  if (cleaned !== offTopicReply(city) && (MEDICINE_TOPIC.test(text) || MEDICINE_TOPIC.test(cleaned))) {
    cleaned = enforceMedicineRules(cleaned);
  }
  const { text: reply, sources } = resolveCitations(cleaned, context.sources);

  // 6. History (usage was logged by generateTracked)
  if (!conversation) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title: conversationTitle(text) })
      .select("id, title")
      .single();
    if (error || !data) {
      console.error("[api/chat] could not create conversation", error?.message);
    } else {
      conversation = data;
    }
  }
  let updatedAt = new Date().toISOString();
  if (conversation) {
    const { error: saveError } = await supabase.from("chat_messages").insert([
      { user_id: userId, conversation_id: conversation.id, role: "user", content: text, created_at: askedAt.toISOString() },
      { user_id: userId, conversation_id: conversation.id, role: "assistant", content: reply, created_at: updatedAt },
    ]);
    if (saveError) console.error("[api/chat] could not save messages", saveError.message);
    updatedAt = new Date().toISOString();
  }

  return Response.json({
    conversation: conversation ? { ...conversation, updatedAt } : null,
    reply,
    sources,
    remaining: Math.max(0, usage.remaining - 1),
    limit: usage.limit,
  } satisfies ChatApiSuccess);
}
