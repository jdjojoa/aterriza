/** /identificar constants and types shared by the API route and the UI. */
import type { FoodCard } from "./foods";

export type IdentifyKind = "medicine" | "food";

/** Client-side compression before upload. */
export const MAX_IMAGE_SIDE = 1024;
export const JPEG_QUALITY = 0.7;
/** Base64 length cap (~2.2 MB of image): a 1024 px JPEG is far below it. */
export const MAX_IMAGE_BASE64_LENGTH = 3_000_000;

export const PHOTO_GUIDE = "Fotografía el empaque con el nombre visible";
export const UNREADABLE_MESSAGE = "No pude leer el empaque, toma otra foto con el nombre visible";

/** Fixed notice for AI-generated medicine info (shown verbatim in a box). */
export const AI_MEDICINE_NOTICE =
  "Información referencial generada por IA. No es una recomendación médica. Consulta a un farmacéutico o médico. Que dos productos tengan el mismo principio activo no los hace iguales: cualquier equivalencia es solo un equivalente referencial. Verifica el registro en DIGEMID.";

/** DIGEMID public lookup of pharmaceutical products (Peru). */
export const DIGEMID_URL = "https://opm-digemid.minsa.gob.pe/";
export const DIGEMID_NAME = "DIGEMID · Observatorio de Productos Farmacéuticos";

export type Confidence = "alta" | "media" | "baja";

/** What Gemini read on the package. */
export type PackageReading = {
  brandName: string | null;
  activeIngredients: string[];
  concentration: string | null;
  form: string | null;
  confidence: Confidence;
};

/** A row of public.medicines, as shown in the result card. */
export type MedicineCard = {
  brandNamePe: string;
  activeIngredient: string;
  presentation: string | null;
  generalUse: string | null;
  equivalentCo: string | null;
  whereToBuy: string | null;
  warning: string;
  digemidUrl: string;
  sourceName: string;
  sourceUrl: string;
  verifiedAt: string | null;
};

type Quota = { remaining: number; limit: number };

export type IdentifyApiSuccess = Quota &
  (
    | { status: "unreadable"; message: string }
    | { status: "verified"; reading: PackageReading; medicine: MedicineCard }
    /** generalUse is null when the AI text was missing or failed validation. */
    | { status: "ai"; reading: PackageReading; generalUse: string | null }
  );

/** What Gemini recognized in a food photo. */
export type FoodReading = {
  dishName: string;
  mainIngredients: string[];
  confidence: Confidence;
};

export type FoodApiSuccess = Quota &
  (
    | { status: "unreadable"; message: string }
    | { status: "verified"; reading: FoodReading; food: FoodCard }
    /** description is null when the AI text was missing or failed validation. */
    | { status: "ai"; reading: FoodReading; description: string | null; allergenNote: string }
  );

export type IdentifyApiError = {
  error: string;
  code: "unauthorized" | "invalid" | "daily_limit" | "busy" | "failed";
  remaining?: number;
};
