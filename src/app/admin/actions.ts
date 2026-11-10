"use server";

/**
 * Admin Server Actions. Every action re-checks the admin role (Server Actions
 * are public endpoints) and writes with the user's own Supabase session, so
 * RLS (public.is_admin()) enforces the permissions. No service role here.
 */
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, todayInLima } from "@/lib/admin/auth";
import { CONTENT_CONFIG, isContentTable, type ContentTable } from "@/lib/admin/content-config";
import {
  ALLOWED_IMAGE_TYPES,
  CONTENT_IMAGES_BUCKET,
  IMAGE_TABLES,
  MAX_IMAGE_BYTES,
  storagePathFromPublicUrl,
} from "@/lib/admin/images";
import {
  fieldErrors,
  parseContent,
  rawValuesFromFormData,
  sourceSchema,
  type RawFormValues,
} from "@/lib/admin/schemas";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Result of a one-click admin action (verify, moderate…). */
export type ActionResult = { status: "idle" | "done" | "error"; message: string | null };

export type ContentFormState = {
  status: "idle" | "saved" | "error";
  message: string | null;
  errors: Record<string, string>;
  /** Submitted values, used to refill the form after an error. */
  values: RawFormValues | null;
  /** Bumped on every submit so the form remounts with `values`. */
  version: number;
};

const idSchema = z.guid();

/**
 * Content tables share the same shape for these operations; the column set is
 * validated by zod (schemas.ts) before any write, so a loose type is enough.
 */
function contentFrom(supabase: Supabase, table: ContentTable) {
  return supabase.from(table as "customs");
}

function dbErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "42501") return "No tienes permiso para hacer esto.";
  if (error.code === "23514") return "Los datos no cumplen las reglas de la base de datos. Revisa enlaces, rangos y palabras prohibidas.";
  return "No pudimos guardar los cambios. Inténtalo de nuevo.";
}

async function removeStoredImage(supabase: Supabase, url: string | null | undefined) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  const { error } = await supabase.storage.from(CONTENT_IMAGES_BUCKET).remove([path]);
  if (error) console.error("[admin] image cleanup failed", error.message);
}

// ---------------------------------------------------------------------------
// Content CRUD
// ---------------------------------------------------------------------------

export async function saveContent(
  table: string,
  id: string | null,
  prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  const admin = await requireAdmin();
  if (!isContentTable(table) || (id !== null && !idSchema.safeParse(id).success)) {
    return { ...prev, status: "error", message: "Solicitud no válida.", errors: {} };
  }
  const config = CONTENT_CONFIG[table];
  const raw = rawValuesFromFormData(config, formData);
  const intent = formData.get("intent");
  const version = prev.version + 1;
  const fail = (message: string, errors: Record<string, string> = {}): ContentFormState => ({
    status: "error",
    message,
    errors,
    values: raw,
    version,
  });

  const parsed = parseContent(config, raw);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    const sourceMissing = Boolean(errors.source_name || errors.source_url);
    return fail(
      intent === "verify" && sourceMissing
        ? "Para marcar como verificado completa el nombre y el enlace de la fuente."
        : "Revisa los campos marcados.",
      errors,
    );
  }

  const values: Record<string, unknown> = { ...parsed.data };
  if (intent === "verify") {
    values.verified_at = todayInLima();
    values.verified_by = admin.id;
  } else if (intent === "unverify") {
    values.verified_at = null;
    values.verified_by = null;
  }

  const supabase = await createClient();
  const hasImage = config.fields.some((f) => f.kind === "image");

  if (id === null) {
    const { data, error } = await contentFrom(supabase, table)
      .insert(values as never)
      .select("id")
      .single();
    if (error || !data) {
      console.error("[admin] insert failed", table, error?.message);
      return fail(error ? dbErrorMessage(error) : "No pudimos guardar los cambios.");
    }
    redirect(`/admin/contenido/${table}/${data.id}?creado=1`);
  }

  let previousImage: string | null = null;
  if (hasImage) {
    const { data } = await supabase.from(table as "foods").select("image_url").eq("id", id).maybeSingle();
    previousImage = data?.image_url ?? null;
  }

  const { data, error } = await contentFrom(supabase, table)
    .update(values as never)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[admin] update failed", table, error?.message);
    return fail(error ? dbErrorMessage(error) : "Este registro ya no existe o no tienes permiso.");
  }
  if (hasImage && previousImage && previousImage !== values.image_url) {
    await removeStoredImage(supabase, previousImage);
  }

  refresh();
  const message =
    intent === "verify"
      ? "Guardado y marcado como verificado hoy."
      : intent === "unverify"
        ? "Guardado. Se quitó la verificación."
        : "Cambios guardados.";
  return { status: "saved", message, errors: {}, values: null, version };
}

export async function deleteContent(table: string, id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isContentTable(table) || !idSchema.safeParse(id).success) {
    return { status: "error", message: "Solicitud no válida." };
  }
  const supabase = await createClient();
  const hasImage = CONTENT_CONFIG[table].fields.some((f) => f.kind === "image");

  let image: string | null = null;
  if (hasImage) {
    const { data } = await supabase.from(table as "foods").select("image_url").eq("id", id).maybeSingle();
    image = data?.image_url ?? null;
  }

  const { data, error } = await contentFrom(supabase, table).delete().eq("id", id).select("id");
  if (error || !data?.length) {
    console.error("[admin] delete failed", table, error?.message);
    return { status: "error", message: "No pudimos eliminarlo. Inténtalo de nuevo." };
  }
  await removeStoredImage(supabase, image);
  redirect(`/admin/contenido/${table}?eliminado=1`);
}

/** "Marcar verificado hoy": only when the stored row has a valid source. */
export async function markVerifiedToday(
  table: string,
  id: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!isContentTable(table) || !idSchema.safeParse(id).success) {
    return { status: "error", message: "Solicitud no válida." };
  }
  const supabase = await createClient();
  const { data: row, error: readError } = await contentFrom(supabase, table)
    .select("source_name, source_url")
    .eq("id", id)
    .maybeSingle();
  if (readError || !row) return { status: "error", message: "No encontramos este registro." };

  if (!sourceSchema.safeParse(row).success) {
    return {
      status: "error",
      message: "Falta una fuente válida (nombre y enlace). Edítalo antes de verificar.",
    };
  }

  const { data, error } = await contentFrom(supabase, table)
    .update({ verified_at: todayInLima(), verified_by: admin.id })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    console.error("[admin] verify failed", table, error?.message);
    return { status: "error", message: "No pudimos marcarlo como verificado." };
  }
  refresh();
  return { status: "done", message: "Verificado hoy." };
}

// ---------------------------------------------------------------------------
// Images (bucket content-images)
// ---------------------------------------------------------------------------

export type UploadResult = { url: string; error?: never } | { url?: never; error: string };

function hasImageSignature(bytes: Uint8Array, type: string) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
}

export async function uploadContentImage(table: string, formData: FormData): Promise<UploadResult> {
  await requireAdmin();
  if (!(IMAGE_TABLES as readonly string[]).includes(table)) return { error: "Solicitud no válida." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una imagen." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "La imagen pesa más de 500 KB." };
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { error: "Formato no admitido. Usa WebP, JPEG o PNG." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasImageSignature(bytes, file.type)) return { error: "El archivo no es una imagen válida." };

  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${table}/${crypto.randomUUID()}.${extension}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(CONTENT_IMAGES_BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[admin] upload failed", error.message);
    return { error: "No pudimos subir la imagen. Inténtalo de nuevo." };
  }
  const { data } = supabase.storage.from(CONTENT_IMAGES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

// ---------------------------------------------------------------------------
// Moderation: reports and tips
// ---------------------------------------------------------------------------

export type ReviewModeration = "hide" | "restore" | "dismiss";

export async function moderateReview(
  reviewId: string,
  operation: ReviewModeration,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!idSchema.safeParse(reviewId).success || !["hide", "restore", "dismiss"].includes(operation)) {
    return { status: "error", message: "Solicitud no válida." };
  }
  const supabase = await createClient();

  // Review first: if it fails, the reports stay open and the item stays queued.
  const reviewUpdate =
    operation === "hide"
      ? { status: "hidden" as const }
      : operation === "restore"
        ? { status: "visible" as const, report_count: 0 }
        : { report_count: 0 };
  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .update(reviewUpdate)
    .eq("id", reviewId)
    .select("id");
  if (reviewError || !review?.length) {
    console.error("[admin] review moderation failed", reviewError?.message);
    return { status: "error", message: "No pudimos actualizar la reseña." };
  }

  const { error: reportsError } = await supabase
    .from("reports")
    .update({
      status: operation === "hide" ? "resolved" : "dismissed",
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("review_id", reviewId)
    .eq("status", "open");
  if (reportsError) {
    console.error("[admin] reports update failed", reportsError.message);
    return { status: "error", message: "La reseña cambió, pero no pudimos cerrar sus reportes." };
  }

  refresh();
  const messages: Record<ReviewModeration, string> = {
    hide: "Reseña ocultada.",
    restore: "Reseña restaurada.",
    dismiss: "Reportes descartados.",
  };
  return { status: "done", message: messages[operation] };
}

export async function moderateTip(
  tipId: string,
  decision: "approved" | "rejected",
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!idSchema.safeParse(tipId).success || !["approved", "rejected"].includes(decision)) {
    return { status: "error", message: "Solicitud no válida." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tips")
    .update({ status: decision, reviewed_by: admin.id })
    .eq("id", tipId)
    .eq("status", "pending")
    .select("id");
  if (error || !data?.length) {
    console.error("[admin] tip moderation failed", error?.message);
    return { status: "error", message: "No pudimos actualizar el aporte (quizá ya fue revisado)." };
  }
  refresh();
  return { status: "done", message: decision === "approved" ? "Aporte aprobado." : "Aporte rechazado." };
}
