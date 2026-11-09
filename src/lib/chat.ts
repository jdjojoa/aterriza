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

/** A source the chat answer cites, shown with <SourceBadge>. */
export type ChatSource = {
  label: string; // "F1"
  title: string;
  sourceName: string;
  sourceUrl: string;
  verifiedAt: string | null;
};

export type ChatApiSuccess = {
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
