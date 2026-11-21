"use client";

import { useActionState, useId, useState } from "react";
import { suggestEquivalent, type SuggestionState } from "@/app/actions/equivalents";
import { Button } from "@/components/ui/Button";
import type { CountryEquivalent } from "@/lib/equivalents";
import type { EquivalentContentType } from "@/types/database";

const initialState: SuggestionState = { status: "idle", message: null };

type EquivalentFieldProps = {
  /** "Equivalente referencial en Paraguay", "Parecido en España"… */
  heading: string;
  data: CountryEquivalent;
  contentType: EquivalentContentType;
  /** Name of the medicine, dish or word (goes into the suggestion). */
  contentLabel: string;
  /** Label above the brand names (medicines). */
  brandsLabel?: string;
  /** Classes of the <dt>, to match the card's other labels. */
  labelClassName?: string;
};

/**
 * <dt>/<dd> pair for a card's <dl>: the equivalent for the user's country, or
 * "Aún no tenemos equivalencias para {país}" with "Sugerir una". Renders
 * nothing for national students (data = null).
 */
export function EquivalentField({
  heading,
  data,
  contentType,
  contentLabel,
  brandsLabel,
  labelClassName = "text-sm font-bold text-heading",
}: EquivalentFieldProps) {
  if (!data) return null;
  const { equivalent, countryName } = data;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className={labelClassName}>{heading}</dt>
      <dd className="text-foreground">
        {equivalent ? (
          <>
            {equivalent.text}
            {brandsLabel && equivalent.brandNames.length > 0 && (
              <span className="mt-0.5 block text-sm text-muted">
                {brandsLabel}: {equivalent.brandNames.join(", ")}
              </span>
            )}
          </>
        ) : (
          <SuggestEquivalent countryName={countryName} contentType={contentType} contentLabel={contentLabel} />
        )}
      </dd>
    </div>
  );
}

function SuggestEquivalent({
  countryName,
  contentType,
  contentLabel,
}: {
  countryName: string;
  contentType: EquivalentContentType;
  contentLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(suggestEquivalent, initialState);
  const inputId = useId();

  if (state.status === "saved") {
    return (
      <span role="status" className="font-bold text-heading">
        {state.message}
      </span>
    );
  }

  return (
    <span className="flex flex-col items-start gap-2">
      <span className="text-muted">Aún no tenemos equivalencias para {countryName}.</span>
      {!open ? (
        <Button variant="secondary" className="min-h-11 text-sm" onClick={() => setOpen(true)}>
          Sugerir una
        </Button>
      ) : (
        <form action={formAction} className="flex w-full flex-col gap-2">
          <input type="hidden" name="content_type" value={contentType} />
          <input type="hidden" name="content_label" value={contentLabel} />
          <label htmlFor={inputId} className="text-sm font-bold text-heading">
            ¿Cómo se dice o se llama en {countryName}?
          </label>
          <input
            id={inputId}
            name="text"
            required
            maxLength={200}
            autoComplete="off"
            className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          {state.status === "error" && (
            <span role="alert" className="text-sm font-bold text-on-warning-soft">
              {state.message}
            </span>
          )}
          <span className="flex gap-2">
            <Button type="submit" className="min-h-11 text-sm" disabled={pending}>
              {pending ? "Enviando…" : "Enviar sugerencia"}
            </Button>
            <Button variant="ghost" className="min-h-11 text-sm" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
          </span>
          <span className="text-xs text-muted">Se publica como aporte; el equipo la revisa antes de añadirla.</span>
        </form>
      )}
    </span>
  );
}
