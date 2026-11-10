/** Shared limits for content photos (bucket content-images, see 0007_content_images.sql). */
export const CONTENT_IMAGES_BUCKET = "content-images";
export const MAX_IMAGE_BYTES = 500 * 1024;
export const IMAGE_TABLES = ["foods", "places"] as const;
export const ALLOWED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;

/** Object path inside the bucket for a public URL of this project, or null. */
export function storagePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CONTENT_IMAGES_BUCKET}/`;
  return url.startsWith(base) ? decodeURIComponent(url.slice(base.length)) : null;
}
