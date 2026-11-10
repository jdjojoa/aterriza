"use client";

import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { SourceLink } from "@/components/ui/SourceLink";
import { Reviews } from "@/components/reviews/Reviews";
import { Icon } from "@/components/icons/Icon";
import {
  AI_FOOD_NOTICE,
  allergenNote,
  detectAllergens,
  FOOD_PHOTO_GUIDE,
  normalizeText,
  type FoodCard,
} from "@/lib/foods";
import {
  AI_MEDICINE_NOTICE,
  DIGEMID_URL,
  JPEG_QUALITY,
  MAX_IMAGE_SIDE,
  PHOTO_GUIDE,
  type FoodApiSuccess,
  type FoodReading,
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
// Food cards
// -----------------------------------------------------------------------------

const PENDING_TEXT = "Sin información.";

/** Body of a dish card: shared by the photo result and the dish list. */
function FoodDetails({ food, showReviews = true }: { food: FoodCard; showReviews?: boolean }) {
  const note = allergenNote(detectAllergens(food.name, food.mainIngredients, food.description));
  return (
    <div className="flex flex-col gap-4">
      {food.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external, admin-provided URL
        <img
          src={food.imageUrl}
          alt={`Foto de ${food.name}`}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-xl object-cover"
        />
      )}
      <dl className="flex flex-col gap-3">
        <Field label="Qué es">{food.description ?? PENDING_TEXT}</Field>
        <Field label="Ingredientes principales">{food.mainIngredients ?? PENDING_TEXT}</Field>
        <Field label="Parecido en Colombia">{food.similarCo ?? PENDING_TEXT}</Field>
        <Field label="Dónde probarlo en Piura">{food.whereToTry ?? PENDING_TEXT}</Field>
      </dl>
      <NoticeBox>{note}</NoticeBox>
      <SourceLink sourceName={food.sourceName} sourceUrl={food.sourceUrl} className="-my-2" />
      {showReviews && <Reviews key={food.id} targetType="food" targetId={food.id} />}
    </div>
  );
}

function FoodVerifiedResult({ food }: { food: FoodCard }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Badge variant="success" className="self-start">
          Encontrado en Aterriza
        </Badge>
        <h2 className="text-xl font-extrabold text-heading">{food.name}</h2>
      </div>
      <FoodDetails food={food} />
    </Card>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

function FoodAiResult({
  reading,
  description,
  allergenNote: note,
}: {
  reading: FoodReading;
  description: string | null;
  allergenNote: string;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Badge variant="warning" className="self-start">
          No está en nuestra lista
        </Badge>
        <h2 className="text-xl font-extrabold text-heading">{capitalize(reading.dishName)}</h2>
      </div>
      <dl className="flex flex-col gap-3">
        <Field label="Qué es">{description ?? "No pudimos generar una descripción de este plato."}</Field>
        {reading.mainIngredients.length > 0 && (
          <Field label="Ingredientes que se ven">{reading.mainIngredients.join(", ")}</Field>
        )}
      </dl>
      <NoticeBox>{AI_FOOD_NOTICE}</NoticeBox>
      <NoticeBox>{note}</NoticeBox>
      <SourceBadge
        sourceName="Generado con IA (Google Gemini)"
        sourceUrl="https://ai.google.dev/"
        verifiedAt={null}
        variant="referencial-ia"
      />
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Photo capture (shared by both tabs)
// -----------------------------------------------------------------------------

type QuotaProps = { remaining: number; limit: number; onRemaining: (remaining: number) => void };

type Outcome<T> = { kind: "result"; data: T } | { kind: "error"; message: string };

function usePhotoIdentify<T extends { remaining: number }>(kind: IdentifyKind, onRemaining: (n: number) => void) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome<T> | null>(null);

  async function identify(file: File) {
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
        body: JSON.stringify({ kind, image }),
      });
      const data = (await res.json()) as T | IdentifyApiError;
      if ("error" in data) {
        setOutcome({ kind: "error", message: data.error });
        if (typeof data.remaining === "number") onRemaining(data.remaining);
      } else {
        setOutcome({ kind: "result", data });
        onRemaining(data.remaining);
      }
    } catch {
      setOutcome({ kind: "error", message: "Sin conexión. Revisa tu internet e intenta de nuevo." });
    } finally {
      setPending(false);
    }
  }

  return { preview, pending, outcome, identify };
}

function PhotoPicker({
  remaining,
  limit,
  preview,
  pending,
  placeholder,
  guide,
  hint,
  privacy,
  onFile,
}: Omit<QuotaProps, "onRemaining"> & {
  preview: string | null;
  pending: boolean;
  placeholder: ReactNode;
  guide: string;
  hint: string;
  privacy: string;
  onFile: (file: File) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const outOfQuota = remaining <= 0;

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again
    if (file && !pending && !outOfQuota) onFile(file);
  }

  return (
    <>
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
            placeholder
          )}
        </div>
        <p className="font-bold text-heading">{guide}</p>
        <p className="text-sm text-muted">{hint}</p>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onChange}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={onChange}
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
        <p className="text-sm text-muted">{outOfQuota ? "Ya usaste tus fotos de hoy. Vuelve mañana." : privacy}</p>
      </Card>
    </>
  );
}

function PendingStatus({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-center justify-center gap-2 font-bold text-heading">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
      />
      {children}
    </p>
  );
}

function AlertBox({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
      {children}
    </p>
  );
}

// -----------------------------------------------------------------------------
// Medicine panel
// -----------------------------------------------------------------------------

function MedicinePanel({ remaining, limit, onRemaining }: QuotaProps) {
  const { preview, pending, outcome, identify } = usePhotoIdentify<IdentifyApiSuccess>("medicine", onRemaining);

  return (
    <div className="flex flex-col gap-4">
      <PhotoPicker
        remaining={remaining}
        limit={limit}
        preview={preview}
        pending={pending}
        guide={PHOTO_GUIDE}
        hint="Con buena luz, sin reflejos y con la caja de frente."
        privacy="La foto no se guarda: solo se usa para leer el empaque."
        onFile={identify}
        placeholder={
          <div className="flex flex-col items-center gap-2 px-6">
            <Icon name="camera" size={40} />
            <span className="flex h-10 w-32 items-center justify-center rounded-md border-2 border-current text-xs font-bold">
              NOMBRE
            </span>
          </div>
        }
      />

      <div aria-live="polite" className="flex flex-col gap-4">
        {pending && <PendingStatus>Leyendo el empaque…</PendingStatus>}
        {outcome?.kind === "error" && <AlertBox>{outcome.message}</AlertBox>}
        {outcome?.kind === "result" && outcome.data.status === "unreadable" && (
          <AlertBox>{outcome.data.message}</AlertBox>
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

// -----------------------------------------------------------------------------
// Food panel
// -----------------------------------------------------------------------------

/** Browsable list of dishes for people without a photo. */
function DishList({ foods }: { foods: FoodCard[] | null }) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const headingId = useId();

  const q = normalizeText(query);
  const visible = (foods ?? []).filter(
    (f) =>
      !q ||
      normalizeText(f.name).includes(q) ||
      f.keywords.some((k) => normalizeText(k).includes(q)) ||
      normalizeText(f.mainIngredients ?? "").includes(q),
  );

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-xl font-extrabold text-heading">
          Platos típicos
        </h2>
        <p className="text-muted">¿No tienes foto? Busca el plato en la lista.</p>
      </div>

      {foods === null ? (
        <AlertBox>No pudimos cargar la lista de platos. Revisa tu conexión e inténtalo de nuevo.</AlertBox>
      ) : foods.length === 0 ? (
        <p className="text-muted">Aún no hay platos publicados. Vuelve pronto.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor={inputId} className="text-sm font-bold text-heading">
              Buscar plato o ingrediente
            </label>
            <input
              id={inputId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej.: ceviche, plátano"
              className="min-h-11 rounded-xl border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>
          <p aria-live="polite" className="text-sm text-muted">
            {visible.length === 1 ? "1 plato" : `${visible.length} platos`}
          </p>
          <ul className="flex flex-col gap-3">
            {visible.map((food) => (
              <li key={food.id}>
                <DishItem food={food} />
              </li>
            ))}
          </ul>
          {visible.length === 0 && (
            <p className="text-muted">No encontramos ese plato. Prueba con otro nombre o toma una foto.</p>
          )}
        </>
      )}
    </section>
  );
}

/** Collapsible dish; reviews load only once it is opened. */
function DishItem({ food }: { food: FoodCard }) {
  const [opened, setOpened] = useState(false);
  return (
    <details
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true);
      }}
      className="group rounded-2xl border border-border/30 bg-surface shadow-sm"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-2xl p-4 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-bold text-heading">{food.name}</span>
        </span>
        <span className="text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none">
          <Icon name="chevron-right" />
        </span>
      </summary>
      <div className="px-4 pb-4">
        <FoodDetails food={food} showReviews={opened} />
      </div>
    </details>
  );
}

function FoodPanel({ remaining, limit, onRemaining, foods }: QuotaProps & { foods: FoodCard[] | null }) {
  const { preview, pending, outcome, identify } = usePhotoIdentify<FoodApiSuccess>("food", onRemaining);

  return (
    <div className="flex flex-col gap-4">
      <PhotoPicker
        remaining={remaining}
        limit={limit}
        preview={preview}
        pending={pending}
        guide={FOOD_PHOTO_GUIDE}
        hint="Con buena luz y sin otros platos alrededor."
        privacy="La foto no se guarda: solo se usa para reconocer el plato."
        onFile={identify}
        placeholder={
          <div className="flex flex-col items-center gap-2 px-6">
            <Icon name="camera" size={40} />
            <span className="size-16 rounded-full border-2 border-current" />
          </div>
        }
      />

      <div aria-live="polite" className="flex flex-col gap-4">
        {pending && <PendingStatus>Reconociendo el plato…</PendingStatus>}
        {outcome?.kind === "error" && <AlertBox>{outcome.message}</AlertBox>}
        {outcome?.kind === "result" && outcome.data.status === "unreadable" && (
          <AlertBox>{outcome.data.message}</AlertBox>
        )}
        {outcome?.kind === "result" && outcome.data.status === "verified" && (
          <FoodVerifiedResult food={outcome.data.food} />
        )}
        {outcome?.kind === "result" && outcome.data.status === "ai" && (
          <FoodAiResult
            reading={outcome.data.reading}
            description={outcome.data.description}
            allergenNote={outcome.data.allergenNote}
          />
        )}
      </div>

      <DishList foods={foods} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Tabs
// -----------------------------------------------------------------------------

const TABS: { id: IdentifyKind; label: string }[] = [
  { id: "medicine", label: "Medicamento" },
  { id: "food", label: "Comida" },
];

export function IdentifyClient({
  initialTab = "medicine",
  initialRemaining,
  limit,
  foods,
}: {
  /** Tab to open first (/identificar?tipo=comida opens "food"). */
  initialTab?: IdentifyKind;
  initialRemaining: number;
  limit: number;
  /** Published dishes, or null when they could not be loaded. */
  foods: FoodCard[] | null;
}) {
  const [active, setActive] = useState<IdentifyKind>(initialTab);
  // Medicine and food photos share one daily quota.
  const [remaining, setRemaining] = useState(initialRemaining);
  const quota = { remaining, limit, onRemaining: setRemaining };
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
          {tab.id === "medicine" ? <MedicinePanel {...quota} /> : <FoodPanel {...quota} foods={foods} />}
        </div>
      ))}
    </div>
  );
}
