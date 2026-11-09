/**
 * Lowercase and strip every diacritic, like Postgres unaccent(lower(x)):
 * "Chévere" -> "chevere", "Piña" -> "pina", "¡Guá!" -> "¡gua!".
 * Safe for client and server code.
 */
export function foldText(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
