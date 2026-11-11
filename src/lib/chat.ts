/** Chat constants and types shared by the API route and the /chat UI. */

export const MAX_MESSAGE_LENGTH = 500;

export const CHAT_SUGGESTIONS = [
  "¿Cuánto cuesta una mototaxi?",
  "¿Qué lugares visitar el fin de semana?",
  "¿Qué significa 'causa'?",
  "¿Dónde hay una farmacia?",
] as const;

export const CHAT_DISCLAIMER =
  "Las respuestas se generan con IA de Google y pueden tener errores.";

/**
 * A source the chat answer cites. Verifiable sources (transport fares) are
 * shown with <SourceBadge>; the rest only with a "Fuente" link when present.
 */
export type ChatSource = {
  label: string; // "F1"
  title: string;
  sourceName: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  verifiable: boolean;
};

export const MAX_TITLE_LENGTH = 80;
/** Messages shown when a conversation opens. */
export const HISTORY_ON_LOAD = 40;
/** Conversations listed in the side panel. */
export const MAX_CONVERSATIONS_LISTED = 50;
const TITLE_WORDS = 6;
const TITLE_CHARS = 50;

/** Conversation title from the first message: its first words, no AI call. */
export function conversationTitle(message: string) {
  const words = message.replace(/\s+/g, " ").trim().split(" ");
  let title = words.slice(0, TITLE_WORDS).join(" ");
  if (title.length > TITLE_CHARS) title = title.slice(0, TITLE_CHARS).trimEnd();
  if (!title) return "Nuevo chat";
  return title.length < words.join(" ").length ? `${title}…` : title;
}

export type ConversationSummary = { id: string; title: string; updatedAt: string };

export type ChatApiSuccess = {
  /** null only if the conversation could not be saved. */
  conversation: ConversationSummary | null;
  reply: string;
  sources: ChatSource[];
  remaining: number;
  limit: number;
};

export type ChatApiError = {
  error: string;
  code: "unauthorized" | "invalid" | "daily_limit" | "busy" | "failed";
  remaining?: number;
};
