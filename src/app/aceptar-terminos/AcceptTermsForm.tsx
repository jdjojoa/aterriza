"use client";

import { useActionState, useState } from "react";
import { AcceptTermsCheckbox } from "@/components/legal/AcceptTermsCheckbox";
import { Button } from "@/components/ui/Button";
import { acceptTerms, type AcceptTermsState } from "./actions";

const initialState: AcceptTermsState = { error: null };

export function AcceptTermsForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(acceptTerms, initialState);
  const [accepted, setAccepted] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <AcceptTermsCheckbox checked={accepted} onChange={setAccepted} />
      {state.error && (
        <p role="alert" className="text-sm font-bold text-on-warning-soft">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending || !accepted}>
        {pending ? "Guardando…" : "Continuar"}
      </Button>
    </form>
  );
}
