"use client";

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TIP_CATEGORIES, TIP_MAX_LENGTH, isTipCategory, type TipCategory } from "@/lib/community";
import { deleteTip, updateTip } from "./actions";

type MyTipCardProps = {
  id: string;
  category: string | null;
  body: string;
  status: "pending" | "approved" | "rejected";
  /** Server-rendered header: status badge, category and date. */
  header: ReactNode;
};

const actionClasses =
  "inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-heading hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

/** One of the author's own tips, with edit and delete (confirmed). */
export function MyTipCard({ id, category, body, status, header }: MyTipCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTip(id);
      if (result.status === "error") {
        setConfirmDelete(false);
        setError(result.message);
      }
      // On success the page refreshes and this card disappears.
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm">
      {header}
      {editing ? (
        <EditTipForm
          id={id}
          category={isTipCategory(category) ? category : null}
          body={body}
          status={status}
          onCancel={() => setEditing(false)}
          onSaved={(text) => {
            setEditing(false);
            setMessage(text);
          }}
        />
      ) : (
        <>
          <p className="whitespace-pre-line break-words text-foreground">{body}</p>
          <div className="-mx-3 -mb-2 flex flex-wrap gap-1">
            <button
              type="button"
              className={actionClasses}
              onClick={() => {
                setMessage(null);
                setError(null);
                setEditing(true);
              }}
            >
              <Icon name="pencil" size={18} />
              Editar
            </button>
            <button
              type="button"
              className={actionClasses}
              onClick={() => {
                setMessage(null);
                setConfirmDelete(true);
              }}
              disabled={pending}
            >
              <Icon name="trash" size={18} />
              Eliminar
            </button>
          </div>
        </>
      )}
      <p role="status" className="text-sm font-bold text-heading empty:hidden">
        {message ?? ""}
      </p>
      {error && (
        <p role="alert" className="text-sm font-bold text-on-warning-soft">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este aporte?"
        description="Se borrará para siempre. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        pendingLabel="Eliminando…"
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </li>
  );
}

function EditTipForm({
  id,
  category: initialCategory,
  body: initialBody,
  status,
  onCancel,
  onSaved,
}: {
  id: string;
  category: TipCategory | null;
  body: string;
  status: MyTipCardProps["status"];
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const textId = useId();
  const countId = useId();
  const errorId = useId();
  const [category, setCategory] = useState<TipCategory | null>(initialCategory);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateTip(id, formData);
      if (result.status === "error") setError(result.message);
      else onSaved(result.message);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold text-heading">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {TIP_CATEGORIES.map((c) => (
            <Chip key={c.value} selected={category === c.value} onClick={() => setCategory(c.value)}>
              {c.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <input type="hidden" name="category" value={category ?? ""} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={textId} className="text-sm font-bold text-heading">
          Tu consejo o experiencia
        </label>
        <textarea
          id={textId}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={TIP_MAX_LENGTH}
          rows={5}
          required
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={[countId, error ? errorId : null].filter(Boolean).join(" ")}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <p id={countId} className="text-right text-sm text-muted">
          {body.length}/{TIP_MAX_LENGTH}
        </p>
      </div>

      {status !== "pending" && (
        <p className="rounded-xl bg-warning-soft p-3 text-sm font-bold text-on-warning-soft">
          {status === "approved"
            ? "Al guardar, tu aporte deja de estar publicado y vuelve a revisión."
            : "Al guardar, tu aporte vuelve a revisión."}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="font-bold text-on-warning-soft">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 min-[400px]:flex-row min-[400px]:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
