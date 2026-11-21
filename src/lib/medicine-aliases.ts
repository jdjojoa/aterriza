/**
 * Other countries' names for the same active ingredient, mapped to the name
 * used in Peru (public.medicines.active_ingredient). Lets a photo of a foreign
 * package (e.g. "Dolex · acetaminofén") find the Peruvian row.
 */
const INGREDIENT_ALIASES: Record<string, string> = {
  acetaminofen: "paracetamol",
  acetaminophen: "paracetamol",
  clorfeniramina: "clorfenamina",
  clorferinamina: "clorfenamina",
  chlorpheniramine: "clorfenamina",
  maleato_de_clorfeniramina: "clorfenamina",
  dimenhydrinate: "dimenhidrinato",
  simethicone: "simeticona",
  ibuprofen: "ibuprofeno",
  naproxen: "naproxeno",
  loratadine: "loratadina",
  omeprazole: "omeprazol",
  clotrimazole: "clotrimazol",
  caffeine: "cafeína",
  phenylephrine: "fenilefrina",
};

function key(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

/** Peruvian name of each ingredient (unknown names are kept as they are). */
export function toPeruvianIngredients(ingredients: string[]) {
  return [...new Set(ingredients.map((i) => INGREDIENT_ALIASES[key(i)] ?? i))];
}
