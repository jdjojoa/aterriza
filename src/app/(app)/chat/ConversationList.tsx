"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MAX_TITLE_LENGTH, type ConversationSummary } from "@/lib/chat";

const iconButton =
  "flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60";

const dateFormat = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" });

/** Conversations list (most recent first) with "Nuevo chat", rename and delete. */
export function ConversationList({
  conversations,
  activeId,
  disabled,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  disabled: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
}) {
  const headingId = useId();
  return (
    <nav aria-labelledby={headingId} className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 id={headingId} className="sr-only">
        Conversaciones
      </h2>
      <Button onClick={onNew} disabled={disabled} className="w-full">
        <Icon name="plus" />
        Nuevo chat
      </Button>
      {conversations.length === 0 ? (
        <p className="px-1 text-sm text-muted">Aún no tienes conversaciones.</p>
      ) : (
        <ul className="-mx-1 flex min-h-0 flex-col gap-1 overflow-y-auto px-1 py-1">
          {conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <li
                key={c.id}
                className={`flex items-center gap-1 rounded-xl ${active ? "bg-accent-soft text-on-accent-soft" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  disabled={disabled}
                  aria-current={active ? "true" : undefined}
                  className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-xl px-3 py-1.5 text-left hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed"
                >
                  <span className={`truncate font-bold ${active ? "" : "text-heading"}`}>{c.title}</span>
                  {/* Server (UTC) and browser time zones may disagree on the day. */}
                  <span suppressHydrationWarning className={`text-xs ${active ? "" : "text-muted"}`}>
                    {dateFormat.format(new Date(c.updatedAt))}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRename(c)}
                  disabled={disabled}
                  className={`${iconButton} ${active ? "" : "text-heading"}`}
                >
                  <Icon name="pencil" size={18} />
                  <span className="sr-only">Renombrar «{c.title}»</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  disabled={disabled}
                  className={`${iconButton} ${active ? "" : "text-heading"}`}
                >
                  <Icon name="trash" size={18} />
                  <span className="sr-only">Eliminar «{c.title}»</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}

/** Left drawer on <dialog> (focus trap, Escape and top layer for free). */
export function ConversationDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 h-dvh max-h-dvh w-[85vw] max-w-xs rounded-r-3xl border border-l-0 border-border/30 bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="flex h-full flex-col gap-3 px-4 pt-3 pb-6">
        <div className="flex items-center justify-between gap-3">
          <p id={titleId} className="text-xl font-extrabold text-heading">
            Conversaciones
          </p>
          <button type="button" onClick={onClose} className={`-mr-2 text-heading ${iconButton}`}>
            <Icon name="close" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** Modal with a text field to rename a conversation. */
export function RenameDialog({
  conversation,
  pending,
  error,
  onCancel,
  onSave,
}: {
  conversation: ConversationSummary | null;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (title: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [value, setValue] = useState("");
  const open = conversation !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Prefill with the current title each time the dialog opens.
  const [shownFor, setShownFor] = useState<string | null>(null);
  if (conversation && conversation.id !== shownFor) {
    setShownFor(conversation.id);
    setValue(conversation.title);
  }
  if (!conversation && shownFor !== null) setShownFor(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (value.trim()) onSave(value);
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-border/30 bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5">
        <h2 id={titleId} className="text-xl font-extrabold text-heading">
          Renombrar conversación
        </h2>
        <Input
          label="Nombre"
          value={value}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          error={error ?? undefined}
          autoFocus
          required
        />
        <div className="flex flex-col-reverse gap-2 min-[400px]:flex-row min-[400px]:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || !value.trim()}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
