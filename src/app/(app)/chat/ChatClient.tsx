"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { SourceLink } from "@/components/ui/SourceLink";
import { Icon } from "@/components/icons/Icon";
import {
  CHAT_DISCLAIMER,
  CHAT_SUGGESTIONS,
  MAX_MESSAGE_LENGTH,
  type ChatApiError,
  type ChatApiSuccess,
  type ChatSource,
  type ConversationSummary,
} from "@/lib/chat";
import type { ChatRole } from "@/types/database";
import { deleteConversation, loadConversation, renameConversation } from "./actions";
import { ConversationDrawer, ConversationList, RenameDialog } from "./ConversationList";

export type ChatItem = {
  id: string;
  role: ChatRole | "error";
  content: string;
  sources: ChatSource[];
};

const URL_PATTERN = /(https?:\/\/[^\s)\]]+)/g;

/** Plain text with clickable http(s) links. */
function MessageText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function Bubble({ item }: { item: ChatItem }) {
  if (item.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-on-primary">
          <span className="sr-only">Tú: </span>
          <MessageText text={item.content} />
        </div>
      </li>
    );
  }

  if (item.role === "error") {
    return (
      <li className="flex justify-start">
        <div
          role="alert"
          className="max-w-[85%] rounded-2xl rounded-bl-md bg-warning-soft px-4 py-2.5 font-bold text-on-warning-soft"
        >
          {item.content}
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col items-start gap-2">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border/30 bg-surface px-4 py-2.5 text-foreground shadow-sm">
        <span className="sr-only">Aterriza: </span>
        <MessageText text={item.content} />
      </div>
      {item.sources.length > 0 && (
        <details className="w-full max-w-[85%] rounded-xl text-sm">
          <summary className="min-h-11 cursor-pointer content-center rounded-xl px-1 font-bold text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {item.sources.length === 1 ? "Ver fuente" : `Ver ${item.sources.length} fuentes`}
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {item.sources.map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <p className="font-bold text-heading">{s.title}</p>
                {s.verifiable && s.sourceName && s.sourceUrl ? (
                  <SourceBadge sourceName={s.sourceName} sourceUrl={s.sourceUrl} verifiedAt={s.verifiedAt} />
                ) : (
                  <SourceLink sourceName={s.sourceName} sourceUrl={s.sourceUrl} className="-my-2" />
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </li>
  );
}

function Typing() {
  return (
    <li className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border/30 bg-surface px-4 py-3.5 shadow-sm">
        <span className="sr-only">Aterriza está escribiendo…</span>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="size-2 animate-bounce rounded-full bg-muted motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </li>
  );
}

export function ChatClient({
  city,
  initialConversations,
  initialActiveId,
  initialMessages,
  initialRemaining,
  limit,
  initialQuestion,
}: {
  city: string;
  initialConversations: ConversationSummary[];
  initialActiveId: string | null;
  initialMessages: ChatItem[];
  initialRemaining: number;
  limit: number;
  /** Question typed on /inicio (?q=…), sent once on arrival. */
  initialQuestion?: string;
}) {
  const [messages, setMessages] = useState<ChatItem[]>(initialMessages);
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 0) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, pending]);

  const outOfQuota = remaining <= 0;

  // Send the question from /inicio once, then drop ?q= so a reload does not resend it.
  const sentInitial = useRef(false);
  useEffect(() => {
    if (!initialQuestion || sentInitial.current) return;
    sentInitial.current = true;
    showUrl(null);
    void send(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending || loading || outOfQuota) return;

    const push = (item: Omit<ChatItem, "id">) =>
      setMessages((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);

    push({ role: "user", content: text, sources: [] });
    setDraft("");
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, conversation_id: activeId }),
      });
      const data = (await res.json()) as ChatApiSuccess | ChatApiError;
      if ("error" in data) {
        push({ role: "error", content: data.error, sources: [] });
        if (typeof data.remaining === "number") setRemaining(data.remaining);
      } else {
        push({ role: "assistant", content: data.reply, sources: data.sources });
        setRemaining(data.remaining);
        const conversation = data.conversation;
        if (conversation) {
          // New or updated conversation goes to the top of the list.
          setConversations((prev) => [conversation, ...prev.filter((c) => c.id !== conversation.id)]);
          if (conversation.id !== activeId) {
            setActiveId(conversation.id);
            showUrl(conversation.id);
          }
        }
      }
    } catch {
      push({ role: "error", content: "Sin conexión. Revisa tu internet e intenta de nuevo.", sources: [] });
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  /** Keeps ?c= in sync so a reload reopens the same conversation. */
  function showUrl(id: string | null) {
    window.history.replaceState(null, "", id ? `/chat?c=${id}` : "/chat");
  }

  function startNew() {
    setDrawerOpen(false);
    setNotice(null);
    setActiveId(null);
    setMessages([]);
    showUrl(null);
    inputRef.current?.focus();
  }

  async function openConversation(id: string) {
    setDrawerOpen(false);
    if (id === activeId) return;
    setNotice(null);
    setLoading(true);
    const result = await loadConversation(id).catch(() => null);
    setLoading(false);
    if (!result || result.status === "error") {
      setNotice(result?.message ?? "Sin conexión. Revisa tu internet e intenta de nuevo.");
      return;
    }
    setActiveId(id);
    setMessages(
      (result.messages ?? []).map((m) => ({ id: m.id, role: m.role, content: m.content, sources: [] })),
    );
    showUrl(id);
  }

  async function saveTitle(title: string) {
    if (!renaming) return;
    const target = renaming;
    setActionPending(true);
    setRenameError(null);
    const result = await renameConversation(target.id, title).catch(() => null);
    setActionPending(false);
    if (!result || result.status === "error") {
      setRenameError(result?.message ?? "Sin conexión. Revisa tu internet e intenta de nuevo.");
      return;
    }
    const clean = title.replace(/\s+/g, " ").trim();
    setConversations((prev) => prev.map((c) => (c.id === target.id ? { ...c, title: clean } : c)));
    setRenaming(null);
  }

  async function removeConversation() {
    if (!deleting) return;
    const target = deleting;
    setActionPending(true);
    const result = await deleteConversation(target.id).catch(() => null);
    setActionPending(false);
    setDeleting(null);
    if (!result || result.status === "error") {
      setNotice(result?.message ?? "Sin conexión. Revisa tu internet e intenta de nuevo.");
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== target.id));
    if (target.id === activeId) startNew();
  }

  const listBusy = pending || loading || actionPending;
  const list = (
    <ConversationList
      conversations={conversations}
      activeId={activeId}
      disabled={listBusy}
      onNew={startNew}
      onSelect={(id) => void openConversation(id)}
      onRename={(c) => {
        setRenameError(null);
        setRenaming(c);
      }}
      onDelete={setDeleting}
    />
  );
  const activeTitle = conversations.find((c) => c.id === activeId)?.title ?? "Nuevo chat";

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
      <aside className="sticky top-20 hidden max-h-[calc(100dvh-7rem)] self-start lg:flex lg:flex-col">
        {list}
      </aside>
      <ConversationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {list}
      </ConversationDrawer>
      <RenameDialog
        conversation={renaming}
        pending={actionPending}
        error={renameError}
        onCancel={() => setRenaming(null)}
        onSave={(title) => void saveTitle(title)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="¿Eliminar esta conversación?"
        description={`Se borrarán «${deleting?.title ?? ""}» y todos sus mensajes. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        pendingLabel="Eliminando…"
        pending={actionPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void removeConversation()}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-2xl">
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border-2 border-primary-edge bg-surface px-3 text-left font-bold text-heading hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="list" />
            <span className="truncate">{activeTitle}</span>
            <span className="sr-only"> · Ver conversaciones</span>
          </button>
          <button
            type="button"
            onClick={startNew}
            disabled={listBusy}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary-edge bg-primary text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="plus" />
            <span className="sr-only">Nuevo chat</span>
          </button>
        </div>
        <h2 className="hidden truncate text-xl font-extrabold text-heading lg:block">{activeTitle}</h2>
        {notice && (
          <p role="alert" className="rounded-xl bg-warning-soft px-4 py-2.5 font-bold text-on-warning-soft">
            {notice}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <p aria-live="polite">
            <Badge variant={remaining > 3 ? "success" : "warning"}>
              {remaining === 1
                ? `Te queda 1 consulta de ${limit} hoy`
                : `Te quedan ${remaining} consultas de ${limit} hoy`}
            </Badge>
          </p>
          <p className="text-sm text-muted">{CHAT_DISCLAIMER}</p>
        </div>

        {loading && (
          <p role="status" className="text-muted">
            Cargando conversación…
          </p>
        )}

        {messages.length === 0 && !loading && (
          <section aria-labelledby="chat-welcome" className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
                <Icon name="chat" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 id="chat-welcome" className="font-bold text-heading">
                  Hola, soy Aterriza
                </h2>
                <p className="text-foreground">
                  Pregúntame sobre transporte, lugares, comida, medicamentos, jerga o trámites en {city}.
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-heading">Prueba con:</p>
            <ul className="flex flex-col gap-2">
              {CHAT_SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => void send(s)}
                    disabled={pending || outOfQuota}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border-2 border-primary-edge bg-surface px-4 py-2 text-left font-bold text-heading transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {s}
                    <Icon name="chevron-right" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ul aria-label="Conversación" aria-live="polite" className="flex flex-col gap-3">
          {messages.map((m) => (
            <Bubble key={m.id} item={m} />
          ))}
          {pending && <Typing />}
        </ul>
        <div ref={endRef} />

        <form
          onSubmit={onSubmit}
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-auto lg:bottom-4 flex items-end gap-2 rounded-2xl border border-border/30 bg-background/95 p-2 shadow-sm backdrop-blur"
        >
          <label htmlFor="chat-input" className="sr-only">
            Escribe tu pregunta
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={outOfQuota}
            placeholder={outOfQuota ? "Vuelve mañana para más consultas" : "Escribe tu pregunta…"}
            className="field-sizing-content max-h-36 min-h-11 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || loading || outOfQuota || !draft.trim()}
            aria-label="Enviar"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary-edge bg-primary text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="send" />
          </button>
        </form>
      </div>
    </div>
  );
}
