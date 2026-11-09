import type { Content } from "@google/genai";
import {
  MAX_MESSAGE_LENGTH,
  type ChatApiError,
  type ChatApiSuccess,
} from "@/lib/chat";
import { buildChatContext, resolveCitations } from "@/lib/chat-context";
import { countryName } from "@/lib/countries";
import { chatModel, getGemini, isGeminiRateLimited } from "@/lib/gemini";
import { buildChatSystemPrompt, offTopicReply } from "@/lib/prompts/chat";
import { getUsage, recordUsage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const HISTORY_SIZE = 6;

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
  try {
    ({ message } = await request.json());
  } catch {
    return fail(400, "invalid", "Mensaje no válido.");
  }
  if (typeof message !== "string" || !message.trim()) {
    return fail(400, "invalid", "Escribe una pregunta.");
  }
  message = message.trim();
  const text = message as string;
  if (text.length > MAX_MESSAGE_LENGTH) {
    return fail(400, "invalid", `Tu pregunta puede tener hasta ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  // 3. Daily limit
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
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_SIZE),
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
    const response = await getGemini().models.generateContent({
      model: chatModel(),
      contents,
      config: { systemInstruction, temperature: 0.4, maxOutputTokens: 800 },
    });
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

  const { text: reply, sources } = resolveCitations(
    stripStrayOffTopic(enforceWording(raw), city),
    context.sources,
  );

  // 6. Usage + history
  await recordUsage(userId, "chat");
  const { error: saveError } = await supabase.from("chat_messages").insert([
    { user_id: userId, role: "user", content: text, created_at: askedAt.toISOString() },
    { user_id: userId, role: "assistant", content: reply, created_at: new Date().toISOString() },
  ]);
  if (saveError) console.error("[api/chat] could not save messages", saveError.message);

  return Response.json({
    reply,
    sources,
    remaining: Math.max(0, usage.remaining - 1),
    limit: usage.limit,
  } satisfies ChatApiSuccess);
}
