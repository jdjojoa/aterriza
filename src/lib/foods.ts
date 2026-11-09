/** Food helpers shared by the API route, the server page and the UI (no secrets here). */
import type { Database } from "@/types/database";

type FoodRow = Database["public"]["Tables"]["foods"]["Row"];

/** Columns needed to render a food card. */
export const FOOD_COLUMNS =
  "id, name, description, main_ingredients, similar_co, where_to_try, image_url, keywords, source_name, source_url, verified_at";

export type FoodListRow = Pick<
  FoodRow,
  | "id"
  | "name"
  | "description"
  | "main_ingredients"
  | "similar_co"
  | "where_to_try"
  | "image_url"
  | "keywords"
  | "source_name"
  | "source_url"
  | "verified_at"
>;

/** A row of public.foods, as shown in the result card and the dish list. */
export type FoodCard = {
  id: string;
  name: string;
  description: string | null;
  mainIngredients: string | null;
  similarCo: string | null;
  whereToTry: string | null;
  imageUrl: string | null;
  keywords: string[];
  sourceName: string;
  sourceUrl: string;
  verifiedAt: string | null;
};

export function toFoodCard(f: FoodListRow): FoodCard {
  return {
    id: f.id,
    name: f.name,
    description: f.description,
    mainIngredients: f.main_ingredients,
    similarCo: f.similar_co,
    whereToTry: f.where_to_try,
    imageUrl: f.image_url,
    keywords: f.keywords ?? [],
    sourceName: f.source_name,
    sourceUrl: f.source_url,
    verifiedAt: f.verified_at,
  };
}

/** Lowercase, no accents: "Majarisco Piurano" -> "majarisco piurano". */
export function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Common allergens and the words that reveal them in a dish name or ingredient list. */
const ALLERGENS: { label: string; words: string[] }[] = [
  {
    label: "mariscos",
    words: ["marisco", "langostino", "camaron", "concha", "calamar", "pulpo", "choro", "mejillon", "cangrejo", "pota"],
  },
  {
    label: "pescado",
    words: ["pescado", "ceviche", "cebiche", "mero", "corvina", "atun", "bonito", "lenguado", "caballa", "tollo", "cachema"],
  },
  { label: "maní", words: ["mani", "cacahuate"] },
  { label: "frutos secos", words: ["nuez", "nueces", "pecana", "almendra"] },
  { label: "lácteos", words: ["leche", "queso", "crema de leche", "mantequilla", "natilla"] },
  { label: "huevo", words: ["huevo", "mayonesa"] },
  { label: "gluten", words: ["trigo", "harina", "pan", "galleta", "fideo", "tallarin"] },
  { label: "soya", words: ["soya", "soja", "sillao"] },
];

/**
 * Allergens detected by keyword in the given texts. Whole words only (plus
 * Spanish plurals), so "ají panca" does not count as "pan".
 */
export function detectAllergens(...texts: (string | null | undefined)[]) {
  const haystack = ` ${normalizeText(texts.filter(Boolean).join(" ")).replace(/[^a-z0-9]+/g, " ")} `;
  const has = (w: string) => [` ${w} `, ` ${w}s `, ` ${w}es `].some((form) => haystack.includes(form));
  return ALLERGENS.filter(({ words }) => words.some(has)).map((a) => a.label);
}

function joinList(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

/** Always-shown allergen note: detected allergens first, then a general reminder. */
export function allergenNote(detected: string[]) {
  const general =
    "Si tienes alergias, pregunta siempre en el local: muchos platos peruanos llevan mariscos, maní, lácteos, huevo o gluten.";
  return detected.length ? `Puede contener ${joinList(detected)}. ${general}` : general;
}

/** Notice for an AI description (shown verbatim in a box). */
export const AI_FOOD_NOTICE =
  "Descripción referencial generada por IA a partir de la foto. Puede no ser exacta: confirma en el local qué lleva el plato.";

export const FOOD_PHOTO_GUIDE = "Fotografía el plato completo, desde arriba";
export const FOOD_UNREADABLE_MESSAGE =
  "No pude reconocer el plato, toma otra foto con la comida bien visible y buena luz";
