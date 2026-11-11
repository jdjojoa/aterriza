"use server";

import { getCurrentProfile } from "@/lib/auth";
import { HISTORY_ON_LOAD, MAX_TITLE_LENGTH } from "@/lib/chat";
import { createClient } from "@/lib/supabase/server";
import type { ChatRole } from "@/types/database";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ConversationMessage = { id: string; role: ChatRole; content: string };

export type ConversationResult =
  | { status: "done"; messages?: ConversationMessage[] }
  | { status: "error"; message: string };

/** Latest messages of one of the user's conversations (RLS: own rows only). */
export async function loadConversation(conversationId: string): Promise<ConversationResult> {
  if (!UUID.test(conversationId)) return { status: "error", message: "Conversación no válida." };
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_ON_LOAD);
  if (error) {
    console.error("[chat] load failed", error.message);
    return { status: "error", message: "No pudimos abrir la conversación. Inténtalo de nuevo." };
  }
  return { status: "done", messages: (data ?? []).reverse() };
}

export async function renameConversation(conversationId: string, title: string): Promise<ConversationResult> {
  const clean = title.replace(/\s+/g, " ").trim();
  if (!UUID.test(conversationId)) return { status: "error", message: "Conversación no válida." };
  if (!clean) return { status: "error", message: "Escribe un nombre." };
  if (clean.length > MAX_TITLE_LENGTH) {
    return { status: "error", message: `Usa como máximo ${MAX_TITLE_LENGTH} caracteres.` };
  }
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ title: clean })
    .eq("id", conversationId)
    .eq("user_id", profile.id)
    .select("id");
  if (error || !data?.length) {
    console.error("[chat] rename failed", error?.message);
    return { status: "error", message: "No pudimos renombrar la conversación. Inténtalo de nuevo." };
  }
  return { status: "done" };
}

/** Deletes the conversation; its messages go with it (on delete cascade). */
export async function deleteConversation(conversationId: string): Promise<ConversationResult> {
  if (!UUID.test(conversationId)) return { status: "error", message: "Conversación no válida." };
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", profile.id)
    .select("id");
  if (error || !data?.length) {
    console.error("[chat] delete failed", error?.message);
    return { status: "error", message: "No pudimos eliminar la conversación. Inténtalo de nuevo." };
  }
  return { status: "done" };
}
