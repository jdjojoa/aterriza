/**
 * Browser-only image compression for admin uploads: resizes and re-encodes
 * with <canvas> until the file fits the bucket limit. No extra dependencies.
 */
import { MAX_IMAGE_BYTES } from "./images";

const MAX_SIDE = 1600;
const MIN_SIDE = 320;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Returns a WebP (or JPEG where WebP encoding is unsupported) under 500 KB. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");

  // createImageBitmap applies EXIF orientation by default in modern browsers.
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("No pudimos leer la imagen. Prueba con otra foto.");
  });

  try {
    let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tu navegador no permite comprimir imágenes.");

    while (Math.max(bitmap.width, bitmap.height) * scale >= MIN_SIDE) {
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      context.fillStyle = "#ffffff"; // flatten transparency for JPEG
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.7, 0.58, 0.46]) {
        let blob = await toBlob(canvas, "image/webp", quality);
        // Browsers without a WebP encoder fall back to PNG; use JPEG instead.
        if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
        if (blob && blob.size <= MAX_IMAGE_BYTES) {
          const extension = blob.type === "image/webp" ? "webp" : "jpg";
          const name = file.name.replace(/\.[^.]+$/, "") || "foto";
          return new File([blob], `${name}.${extension}`, { type: blob.type });
        }
      }
      scale *= 0.75;
    }
    throw new Error("No pudimos dejar la imagen por debajo de 500 KB.");
  } finally {
    bitmap.close();
  }
}
