"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { Icon } from "@/components/icons/Icon";
import {
  AI_MEDICINE_NOTICE,
  DIGEMID_URL,
  JPEG_QUALITY,
  MAX_IMAGE_SIDE,
  PHOTO_GUIDE,
  type IdentifyApiError,
  type IdentifyApiSuccess,
  type IdentifyKind,
  type MedicineCard,
  type PackageReading,
} from "@/lib/identify";

// -----------------------------------------------------------------------------
// Image compression (browser): max 1024 px, JPEG 0.7, EXIF orientation applied.
// -----------------------------------------------------------------------------

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall back to <img> (older Safari).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Returns a JPEG data URL. Throws when the browser cannot decode the file. */
async function compressImage(file: File) {
  const source = await loadImage(file);
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error("empty image");
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#ffffff"; // transparent PNGs become white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

// -----------------------------------------------------------------------------
// Result cards
// -----------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm font-bold text-muted">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

function DigemidButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses("secondary", "md", "w-full")}
    >
      Ver en DIGEMID
      <Icon name="external-link" size={18} />
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  );
}

function NoticeBox({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="rounded-xl border border-border/30 bg-warning-soft p-3 text-sm font-bold text-on-warning-soft">
      {children}
    </p>
  );
}

function VerifiedResult({ medicine }: { medicine: MedicineCard }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Badge variant="success" className="self-start">
          Encontrado en Aterriza
        </Badge>
        <h2 className="text-xl font-extrabold text-heading">{medicine.brandNamePe}</h2>
      </div>
      <dl className="flex flex-col gap-3">
        <Field label="Nombre en Perú">{medicine.brandNamePe}</Field>
        <Field label="Principio activo">{medicine.activeIngredient}</Field>
        {medicine.presentation && <Field label="Presentación">{medicine.presentation}</Field>}
        <Field label="Para qué se usa en general">
          {medicine.generalUse ?? "Sin información verificada todavía."}
        </Field>
        <Field label="Equivalente referencial en Colombia">
          {medicine.equivalentCo ?? "Sin información verificada todavía."}
        </Field>
        <Field label="Dónde comprar">
          {medicine.whereToBuy ?? "Sin información verificada todavía."}
        </Field>
      </dl>
      <NoticeBox>{medicine.warning}</NoticeBox>
      <SourceBadge
        sourceName={medicine.sourceName}
        sourceUrl={medicine.sourceUrl}
        verifiedAt={medicine.verifiedAt}
        variant="verificado"
      />
      <DigemidButton href={medicine.digemidUrl} />
    </Card>
  );
}

function AiResult({ reading, generalUse }: { reading: PackageReading; generalUse: string | null }) {
  const ingredients = reading.activeIngredients.join(" + ");
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Badge variant="warning" className="self-start">
          No está en nuestra base verificada
        </Badge>
        <h2 className="text-xl font-extrabold text-heading">
          {reading.brandName ?? ingredients}
        </h2>
      </div>
      <dl className="flex flex-col gap-3">
        {reading.brandName && <Field label="Nombre en el empaque">{reading.brandName}</Field>}
        <Field label="Principio activo">{ingredients || "No se pudo leer en el empaque."}</Field>
        {reading.form && <Field label="Forma">{reading.form}</Field>}
        {generalUse && <Field label="Para qué se usa en general">{generalUse}</Field>}
      </dl>
      <NoticeBox>{AI_MEDICINE_NOTICE}</NoticeBox>
      <SourceBadge
        sourceName="Generado con IA (Google Gemini)"
        sourceUrl="https://ai.google.dev/"
        verifiedAt={null}
        variant="referencial-ia"
      />
      <DigemidButton href={DIGEMID_URL} />
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Medicine panel
// -----------------------------------------------------------------------------

type Outcome =
  | { kind: "result"; data: IdentifyApiSuccess }
  | { kind: "error"; message: string };

function MedicinePanel({ initialRemaining, limit }: { initialRemaining: number; limit: number }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const outOfQuota = remaining <= 0;

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again
    if (!file || pending || outOfQuota) return;

    setOutcome(null);
    setPending(true);
    try {
      let image: string;
      try {
        image = await compressImage(file);
      } catch {
        setPreview(null);
        setOutcome({ kind: "error", message: "No pudimos abrir esa imagen. Prueba con otra foto (JPG o PNG)." });
        return;
      }
      setPreview(image);

      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "medicine" satisfies IdentifyKind, image }),
      });
      const data = (await res.json()) as IdentifyApiSuccess | IdentifyApiError;
      if ("error" in data) {
        setOutcome({ kind: "error", message: data.error });
        if (typeof data.remaining === "number") setRemaining(data.remaining);
      } else {
        setOutcome({ kind: "result", data });
        setRemaining(data.remaining);
      }
    } catch {
      setOutcome({ kind: "error", message: "Sin conexión. Revisa tu internet e intenta de nuevo." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite">
        <Badge variant={remaining > 1 ? "success" : "warning"}>
          {remaining === 1 ? `Te queda 1 foto de ${limit} hoy` : `Te quedan ${remaining} fotos de ${limit} hoy`}
        </Badge>
      </p>

      <Card className="flex flex-col items-center gap-3 text-center">
        <div
          aria-hidden="true"
          className="relative flex aspect-[4/3] w-full max-w-xs items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary-edge bg-accent-soft text-on-accent-soft"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img src={preview} alt="" className="size-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6">
              <Icon name="camera" size={40} />
              <span className="flex h-10 w-32 items-center justify-center rounded-md border-2 border-current text-xs font-bold">
                NOMBRE
              </span>
            </div>
          )}
        </div>
        <p className="font-bold text-heading">{PHOTO_GUIDE}</p>
        <p className="text-sm text-muted">Con buena luz, sin reflejos y con la caja de frente.</p>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className="flex w-full flex-col gap-2">
          <Button onClick={() => cameraRef.current?.click()} disabled={pending || outOfQuota} className="w-full">
            <Icon name="camera" size={20} />
            Tomar foto
          </Button>
          <Button
            variant="secondary"
            onClick={() => galleryRef.current?.click()}
            disabled={pending || outOfQuota}
            className="w-full"
          >
            <Icon name="image" size={20} />
            Elegir de la galería
          </Button>
        </div>
        <p className="text-sm text-muted">
          {outOfQuota ? "Ya usaste tus fotos de hoy. Vuelve mañana." : "La foto no se guarda: solo se usa para leer el empaque."}
        </p>
      </Card>

      <div aria-live="polite" className="flex flex-col gap-4">
        {pending && (
          <p role="status" className="flex items-center justify-center gap-2 font-bold text-heading">
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
            Leyendo el empaque…
          </p>
        )}
        {outcome?.kind === "error" && (
          <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
            {outcome.message}
          </p>
        )}
        {outcome?.kind === "result" && outcome.data.status === "unreadable" && (
          <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
            {outcome.data.message}
          </p>
        )}
        {outcome?.kind === "result" && outcome.data.status === "verified" && (
          <VerifiedResult medicine={outcome.data.medicine} />
        )}
        {outcome?.kind === "result" && outcome.data.status === "ai" && (
          <AiResult reading={outcome.data.reading} generalUse={outcome.data.generalUse} />
        )}
      </div>
    </div>
  );
}

function FoodPanel() {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
        <Icon name="camera" size={28} />
      </span>
      <Badge variant="warning">Próximamente</Badge>
      <p className="text-muted">Pronto podrás fotografiar un plato y saber qué es y a qué se parece en Colombia.</p>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Tabs
// -----------------------------------------------------------------------------

const TABS: { id: IdentifyKind; label: string }[] = [
  { id: "medicine", label: "Medicamento" },
  { id: "food", label: "Comida" },
];

export function IdentifyClient({ initialRemaining, limit }: { initialRemaining: number; limit: number }) {
  const [active, setActive] = useState<IdentifyKind>("medicine");
  const tabRefs = useRef<Record<IdentifyKind, HTMLButtonElement | null>>({ medicine: null, food: null });

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.id === active);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TABS.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setActive(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Qué quieres identificar"
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 gap-1 rounded-xl border border-border/30 bg-surface p-1"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={`min-h-11 rounded-lg px-3 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                selected ? "bg-primary text-on-primary" : "text-heading hover:bg-hover"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
        >
          {tab.id === "medicine" ? (
            <MedicinePanel initialRemaining={initialRemaining} limit={limit} />
          ) : (
            <FoodPanel />
          )}
        </div>
      ))}
    </div>
  );
}
