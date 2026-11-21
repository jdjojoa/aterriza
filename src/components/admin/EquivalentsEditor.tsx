"use client";

import { useActionState, useId, useState, useTransition } from "react";
import {
  deleteEquivalent,
  saveEquivalent,
  type EquivalentFormState,
} from "@/app/admin/equivalents-actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CountryOption } from "@/lib/countries";
import type { EquivalentContentType } from "@/types/database";

export type EquivalentRowView = {
  id: string;
  countryCode: string;
  countryName: string;
  text: string;
  brandNames: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
};

const TITLES: Record<EquivalentContentType, { title: string; field: string; hint: string }> = {
  medicine: {
    title: "Equivalentes referenciales por país",
    field: "Equivalente referencial",
    hint: "Principio activo y nombre con el que se conoce en ese país. Sin dosis.",
  },
  food: { title: "Parecido por país", field: "Plato parecido", hint: "Un plato de ese país que se le parezca." },
  slang: { title: "Cómo se dice en cada país", field: "Cómo se dice", hint: "Palabra o expresión equivalente." },
};

const initialState: EquivalentFormState = { status: "idle", message: null, version: 0 };

/** List + add/replace form for the equivalents of one medicine, dish or word. */
export function EquivalentsEditor({
  contentType,
  contentId,
  rows,
  countries,
}: {
  contentType: EquivalentContentType;
  contentId: string;
  rows: EquivalentRowView[];
  countries: CountryOption[];
}) {
  const [state, formAction, pending] = useActionState(saveEquivalent, initialState);
  const { title, field, hint } = TITLES[contentType];
  const headingId = useId();
  const countryId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 rounded-2xl border border-border/30 p-4">
      <h2 id={headingId} className="text-xl font-extrabold text-heading">
        {title}
      </h2>
      <p className="text-sm text-muted">
        Cada estudiante ve solo la de su país. Si no hay una para su país, la app le ofrece «Sugerir una».
      </p>

      {rows.length === 0 ? (
        <p className="text-muted">Todavía no hay equivalencias.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <EquivalentItem key={row.id} row={row} />
          ))}
        </ul>
      )}

      {/* key: clears the fields after a successful save. */}
      <form key={state.version} action={formAction} className="flex flex-col gap-3 border-t border-border/30 pt-4">
        <h3 className="font-bold text-heading">Añadir o reemplazar</h3>
        <input type="hidden" name="content_type" value={contentType} />
        <input type="hidden" name="content_id" value={contentId} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={countryId} className="text-sm font-bold text-heading">
            País *
          </label>
          <select
            id={countryId}
            name="country_code"
            required
            defaultValue=""
            className="min-h-11 rounded-xl border border-border bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="">Elige un país</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted">Si ese país ya tiene una, se reemplaza.</p>
        </div>
        <Input label={`${field} *`} name="equivalent_text" required maxLength={300} hint={hint} />
        {contentType === "medicine" && (
          <Input label="Marcas en ese país" name="brand_names" hint="Separadas por comas." maxLength={1000} />
        )}
        <Input label="Nombre de la fuente" name="source_name" maxLength={200} />
        <Input label="Enlace de la fuente" name="source_url" type="url" inputMode="url" placeholder="https://" />
        {contentType === "medicine" && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold text-heading">
            <input type="checkbox" name="verify" className="size-5 accent-[var(--primary-edge)]" />
            Marcar como verificada hoy (requiere fuente)
          </label>
        )}
        {state.status === "error" && (
          <p role="alert" className="text-sm font-bold text-on-warning-soft">
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Guardando…" : "Guardar equivalencia"}
        </Button>
        <p role="status" className="text-center text-sm font-bold text-heading empty:hidden">
          {state.status === "saved" ? state.message : ""}
        </p>
      </form>
    </section>
  );
}

function EquivalentItem({ row }: { row: EquivalentRowView }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-border/30 bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-heading">{row.countryName}</span>
        {row.verifiedAt ? (
          <Badge variant="success">Verificada el {row.verifiedAt}</Badge>
        ) : (
          <Badge variant="neutral">Sin verificar</Badge>
        )}
      </div>
      <p className="text-foreground">{row.text}</p>
      {row.brandNames.length > 0 && <p className="text-sm text-muted">Marcas: {row.brandNames.join(", ")}</p>}
      {row.sourceName && <p className="text-sm text-muted">Fuente: {row.sourceName}</p>}
      <Button
        variant="ghost"
        className="self-start text-sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteEquivalent(row.id);
            setError(result.status === "error" ? result.message : null);
          })
        }
      >
        {pending ? "Eliminando…" : `Eliminar la de ${row.countryName}`}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-bold text-on-warning-soft">
          {error}
        </p>
      )}
    </li>
  );
}
