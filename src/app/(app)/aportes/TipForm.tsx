"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TIP_CATEGORIES, TIP_MAX_LENGTH, type TipCategory } from "@/lib/community";
import { createTip, type TipFormState } from "./actions";

const initialState: TipFormState = { status: "idle", message: null, savedAt: 0 };

export function TipForm() {
  const [state, formAction, pending] = useActionState(createTip, initialState);
  // key: a successful submit remounts the fields, clearing them.
  return <TipFields key={state.savedAt} state={state} formAction={formAction} pending={pending} />;
}

function TipFields({
  state,
  formAction,
  pending,
}: {
  state: TipFormState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const textId = useId();
  const countId = useId();
  const errorId = useId();
  const [category, setCategory] = useState<TipCategory | null>(null);
  const [body, setBody] = useState("");
  const error = state.status === "error" ? state.message : null;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm">
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
          aria-invalid={error ? true : undefined}
          aria-describedby={[countId, error ? errorId : null].filter(Boolean).join(" ")}
          placeholder="Ej.: Para sacar el carné de extranjería, llega temprano a Migraciones y lleva copias."
          className="rounded-xl border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <p id={countId} className="text-right text-sm text-muted">
          {body.length}/{TIP_MAX_LENGTH}
        </p>
      </div>

      {error && (
        <p id={errorId} role="alert" className="font-bold text-on-warning-soft">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Enviar aporte"}
      </Button>
      <p role="status" className="text-center text-sm font-bold text-heading empty:hidden">
        {state.status === "saved" ? state.message : ""}
      </p>
    </form>
  );
}
