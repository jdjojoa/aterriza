import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import {
  HISTORY_ON_LOAD,
  MAX_CONVERSATIONS_LISTED,
  MAX_MESSAGE_LENGTH,
  type ConversationSummary,
} from "@/lib/chat";
import { getUsage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { ChatClient, type ChatItem } from "./ChatClient";

export const metadata: Metadata = { title: "Chat · Aterriza" };

async function ChatData({ searchParams }: { searchParams: PageProps<"/chat">["searchParams"] }) {
  const { q, c } = await searchParams;
  const initialQuestion = typeof q === "string" ? q.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [usage, { data: rows }] = await Promise.all([
    getUsage(profile.id, "chat"),
    supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(MAX_CONVERSATIONS_LISTED),
  ]);
  const conversations: ConversationSummary[] = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
  }));

  // A question from /inicio (?q=) always starts a new chat; ?c= opens one.
  const activeId =
    !initialQuestion && typeof c === "string" && conversations.some((x) => x.id === c) ? c : null;
  const { data: history } = activeId
    ? await supabase
        .from("chat_messages")
        .select("id, role, content")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: false })
        .limit(HISTORY_ON_LOAD)
    : { data: [] };

  const initialMessages: ChatItem[] = (history ?? [])
    .reverse()
    .map((m) => ({ id: m.id, role: m.role, content: m.content, sources: [] }));

  return (
    <ChatClient
      city={profile.destination_city}
      initialConversations={conversations}
      initialActiveId={activeId}
      initialMessages={initialMessages}
      initialRemaining={usage.remaining}
      limit={usage.limit}
      initialQuestion={initialQuestion || undefined}
    />
  );
}

function ChatSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Cargando chat…</span>
      {[0, 1].map((i) => (
        <span key={i} aria-hidden="true" className="h-14 w-full animate-pulse rounded-2xl bg-accent-soft" />
      ))}
    </div>
  );
}

export default function ChatPage({ searchParams }: PageProps<"/chat">) {
  return (
    <main data-wide className="flex flex-1 flex-col gap-4">
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">Chat</h1>
      <Suspense fallback={<ChatSkeleton />}>
        <ChatData searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
