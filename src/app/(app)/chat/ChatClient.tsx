"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { Icon } from "@/components/icons/Icon";
import {
  CHAT_DISCLAIMER,
  CHAT_SUGGESTIONS,
  MAX_MESSAGE_LENGTH,
  type ChatApiError,
  type ChatApiSuccess,
  type ChatSource,
} from "@/lib/chat";
import type { ChatRole } from "@/types/database";

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
                <SourceBadge sourceName={s.sourceName} sourceUrl={s.sourceUrl} verifiedAt={s.verifiedAt} />
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
  initialMessages,
  initialRemaining,
  limit,
}: {
  city: string;
  initialMessages: ChatItem[];
  initialRemaining: number;
  limit: number;
}) {
  const [messages, setMessages] = useState<ChatItem[]>(initialMessages);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 0) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, pending]);

  const outOfQuota = remaining <= 0;

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending || outOfQuota) return;

    const push = (item: Omit<ChatItem, "id">) =>
      setMessages((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);

    push({ role: "user", content: text, sources: [] });
    setDraft("");
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as ChatApiSuccess | ChatApiError;
      if ("error" in data) {
        push({ role: "error", content: data.error, sources: [] });
        if (typeof data.remaining === "number") setRemaining(data.remaining);
      } else {
        push({ role: "assistant", content: data.reply, sources: data.sources });
        setRemaining(data.remaining);
      }
    } catch {
      push({ role: "error", content: "Sin conexión. Revisa tu internet e intenta de nuevo.", sources: [] });
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

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
    <div className="flex flex-1 flex-col gap-4">
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

      {messages.length === 0 && (
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
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-auto flex items-end gap-2 rounded-2xl border border-border/30 bg-background/95 p-2 shadow-sm backdrop-blur"
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
          disabled={pending || outOfQuota || !draft.trim()}
          aria-label="Enviar"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary-edge bg-primary text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="send" />
        </button>
      </form>
    </div>
  );
}
