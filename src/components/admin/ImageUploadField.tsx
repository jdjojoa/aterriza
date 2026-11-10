"use client";

import { useId, useRef, useState } from "react";
import { uploadContentImage } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { compressImage } from "@/lib/admin/compress-image";

type ImageUploadFieldProps = {
  table: string;
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
};

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Compresses the photo in the browser (≤ 500 KB) and uploads it through a
 * Server Action to the public bucket content-images. The form only submits
 * the resulting URL.
 */
export function ImageUploadField({ table, name, label, defaultValue, error }: ImageUploadFieldProps) {
  const inputId = useId();
  const statusId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "info" | "error"; text: string } | null>(
    error ? { tone: "error", text: error } : null,
  );

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setStatus({ tone: "info", text: "Comprimiendo…" });
    try {
      const compressed = await compressImage(file);
      setStatus({ tone: "info", text: `Subiendo (${kb(compressed.size)})…` });
      const formData = new FormData();
      formData.set("file", compressed);
      const result = await uploadContentImage(table, formData);
      if (result.error !== undefined) {
        setStatus({ tone: "error", text: result.error });
      } else {
        setUrl(result.url);
        setStatus({
          tone: "info",
          text: `Imagen subida: ${kb(file.size)} → ${kb(compressed.size)}. Guarda para aplicar el cambio.`,
        });
      }
    } catch (e) {
      setStatus({ tone: "error", text: e instanceof Error ? e.message : "No pudimos subir la imagen." });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={statusId}>
      <legend className="mb-1 text-sm font-bold text-heading">{label}</legend>
      <input type="hidden" name={name} value={url} />
      {url ? (
        // Remote Supabase URL; next/image would need remotePatterns for one preview.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Vista previa de la foto"
          className="aspect-video w-full rounded-xl border border-border/30 bg-accent-soft object-cover"
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
          Sin foto
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-primary-edge bg-surface px-4 font-bold text-heading hover:bg-hover focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          {url ? "Cambiar foto" : "Subir foto"}
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/*"
            disabled={busy}
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        {url && (
          <Button variant="ghost" disabled={busy} onClick={() => setUrl("")}>
            Quitar foto
          </Button>
        )}
      </div>
      <p
        id={statusId}
        role={status?.tone === "error" ? "alert" : "status"}
        className={`text-sm empty:hidden ${status?.tone === "error" ? "font-bold text-on-warning-soft" : "text-muted"}`}
      >
        {status?.text ?? ""}
      </p>
      <p className="text-sm text-muted">Se comprime en tu navegador hasta 500 KB como máximo.</p>
    </fieldset>
  );
}
