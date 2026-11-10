"use client";

import { useActionState, useId, useState, useTransition, type FormEvent } from "react";
import { deleteContent, saveContent, type ContentFormState } from "@/app/admin/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SourceBadge } from "@/components/ui/SourceBadge";
import {
  CONTENT_CONFIG,
  requiresVerification,
  type ContentTable,
  type FieldDef,
} from "@/lib/admin/content-config";
import { fieldErrors, parseContent, rawValuesFromFormData, type RawFormValues } from "@/lib/admin/schemas";
import { ImageUploadField } from "./ImageUploadField";
import { LocationFields } from "./LocationFields";

type ContentFormProps = {
  table: ContentTable;
  id: string | null;
  initialValues: RawFormValues;
  verifiedAt: string | null;
  /** Shown once after creating a row (?creado=1). */
  created?: boolean;
};

const controlClasses =
  "rounded-xl border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function ContentForm({ table, id, initialValues, verifiedAt, created }: ContentFormProps) {
  const initial: ContentFormState = {
    status: "idle",
    message: created ? "Creado. Ya puedes seguir editándolo." : null,
    errors: {},
    values: null,
    version: 0,
  };
  const [state, formAction, pending] = useActionState(saveContent.bind(null, table, id), initial);

  return (
    <div className="flex flex-col gap-6">
      {/* key: remount after each submit so fields show the returned values. */}
      <FormFields
        key={state.version}
        table={table}
        state={state}
        values={state.values ?? initialValues}
        formAction={formAction}
        pending={pending}
        verifiedAt={verifiedAt}
        isNew={id === null}
      />
      {id && <DeleteButton table={table} id={id} />}
    </div>
  );
}

function FormFields({
  table,
  state,
  values,
  formAction,
  pending,
  verifiedAt,
  isNew,
}: {
  table: ContentTable;
  state: ContentFormState;
  values: RawFormValues;
  formAction: (formData: FormData) => void;
  pending: boolean;
  verifiedAt: string | null;
  isNew: boolean;
}) {
  const config = CONTENT_CONFIG[table];
  const verifiable = requiresVerification(table);
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const errors = clientErrors ?? state.errors;
  const errorCount = Object.keys(errors).length;

  // Same zod schema as the server: catches mistakes before the round trip.
  function validate(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    const result = parseContent(config, rawValuesFromFormData(config, formData));
    if (result.success) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    setClientErrors(fieldErrors(result.error));
  }

  const message = clientErrors ? clientErrorMessage(errors) : state.message;
  const isError = Boolean(clientErrors) || state.status === "error";

  return (
    <form action={formAction} onSubmit={validate} noValidate className="flex flex-col gap-5">
      {config.notice && (
        <p className="rounded-xl bg-warning-soft p-3 text-sm font-bold text-on-warning-soft">{config.notice}</p>
      )}

      {config.fields.map((field) => (
        <Field key={field.name} field={field} table={table} value={values[field.name] ?? ""} error={errors[field.name]} />
      ))}

      {config.map && <LocationFields map={config.map} values={values} errors={errors} />}

      <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/30 p-4">
        <legend className="px-1 text-sm font-bold text-heading">
          {verifiable ? "Fuente y verificación" : "Fuente (opcional)"}
        </legend>
        <Input
          label={verifiable ? "Nombre de la fuente *" : "Nombre de la fuente"}
          name="source_name"
          defaultValue={values.source_name}
          maxLength={200}
          required={verifiable}
          error={errors.source_name}
          placeholder="Ej.: Municipalidad Provincial de Piura"
        />
        <Input
          label={verifiable ? "Enlace de la fuente *" : "Enlace de la fuente"}
          name="source_url"
          type="url"
          inputMode="url"
          defaultValue={values.source_url}
          required={verifiable}
          error={errors.source_url}
          hint={
            verifiable
              ? "Obligatorios para guardar y para marcar como verificado."
              : "Si lo completas, la app muestra un enlace «Fuente»."
          }
          placeholder="https://"
        />
        {verifiable && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {verifiedAt ? (
                <Badge variant="success">Verificado el {verifiedAt}</Badge>
              ) : (
                <Badge variant="warning">Referencial (sin verificar)</Badge>
              )}
            </div>
            {!isNew && values.source_name && values.source_url && (
              <SourceBadge sourceName={values.source_name} sourceUrl={values.source_url} verifiedAt={verifiedAt} />
            )}
          </>
        )}
        <label className="flex min-h-11 items-center gap-3 font-bold text-heading">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={values.is_published === "on"}
            className="size-5 accent-primary-edge"
          />
          Publicado (visible en la app)
        </label>
      </fieldset>

      <p
        role={isError ? "alert" : "status"}
        className={`font-bold empty:hidden ${isError ? "text-on-warning-soft" : "text-heading"}`}
      >
        {message ?? ""}
        {isError && errorCount > 0 && ` (${errorCount} ${errorCount === 1 ? "campo" : "campos"})`}
      </p>

      <div className="flex flex-col gap-2">
        <Button type="submit" name="intent" value="save" size="lg" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {verifiable && (
          <Button type="submit" name="intent" value="verify" variant="secondary" disabled={pending}>
            Guardar y marcar verificado hoy
          </Button>
        )}
        {verifiable && verifiedAt && (
          <Button type="submit" name="intent" value="unverify" variant="ghost" disabled={pending}>
            Guardar y quitar verificación
          </Button>
        )}
      </div>
    </form>
  );
}

function clientErrorMessage(errors: Record<string, string>) {
  return errors.source_name || errors.source_url
    ? "Completa la fuente (nombre y enlace) y revisa los campos marcados."
    : "Revisa los campos marcados.";
}

function Field({
  field,
  table,
  value,
  error,
}: {
  field: FieldDef;
  table: ContentTable;
  value: string;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const label = field.required ? `${field.label} *` : field.label;
  const describedBy = [field.hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const extra = (
    <>
      {field.hint && (
        <p id={hintId} className="text-sm text-muted">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-bold text-on-warning-soft">
          {error}
        </p>
      )}
    </>
  );

  switch (field.kind) {
    case "image":
      return <ImageUploadField table={table} name={field.name} label={field.label} defaultValue={value} error={error} />;
    case "textarea":
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-bold text-heading">
            {label}
          </label>
          <textarea
            id={id}
            name={field.name}
            defaultValue={value}
            rows={4}
            maxLength={field.max}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`${controlClasses} py-2`}
          />
          {extra}
        </div>
      );
    case "select":
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-bold text-heading">
            {label}
          </label>
          <select
            id={id}
            name={field.name}
            defaultValue={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`${controlClasses} min-h-11`}
          >
            <option value="">{field.required ? "Elige una opción" : "Sin categoría"}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {extra}
        </div>
      );
    default:
      return (
        <Input
          id={id}
          label={label}
          name={field.name}
          defaultValue={value}
          hint={field.hint}
          error={error}
          type={field.kind === "url" ? "url" : "text"}
          inputMode={field.kind === "number" ? "decimal" : field.kind === "url" ? "url" : undefined}
          maxLength={field.kind === "text" ? field.max : undefined}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
        />
      );
  }
}

function DeleteButton({ table, id }: { table: ContentTable; id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const singular = CONTENT_CONFIG[table].singular;

  return (
    <div className="flex flex-col gap-1 border-t border-border/30 pt-4">
      <Button
        variant="ghost"
        disabled={pending}
        className="self-start"
        onClick={() => {
          if (!window.confirm(`¿Eliminar este ${singular}? No se puede deshacer.`)) return;
          startTransition(async () => {
            const result = await deleteContent(table, id);
            if (result?.status === "error") setError(result.message);
          });
        }}
      >
        {pending ? "Eliminando…" : `Eliminar ${singular}`}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-bold text-on-warning-soft">
          {error}
        </p>
      )}
    </div>
  );
}
