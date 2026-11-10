/**
 * Project rules for medicine text: never doses, never "sustituto" or
 * "intercambiable". Text that breaks them is dropped (the UI then shows the
 * fixed notice instead).
 */
const UNSAFE_PATTERNS: RegExp[] = [
  // Quantities: "500 mg", "5 ml", "2 tabletas", "10 gotas"…
  /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|ml|cc|ui|gotas?|tabletas?|pastillas?|c[aá]psulas?|comprimidos?|grageas?|sobres?|cucharadas?|cucharaditas?|ampollas?|inhalaciones?|aplicaciones?)\b/i,
  // Frequencies: "cada 8 horas", "cada 6 a 8 h"
  /\bcada\s+\d+(?:\s*(?:a|-|–)\s*\d+)?\s*(?:horas?|hrs?|h)\b/i,
  /\bcada\s+(?:dos|tres|cuatro|seis|ocho|doce|veinticuatro)\s+horas\b/i,
  // "dos veces al día", "3 tomas por día"
  /\b(?:una|dos|tres|cuatro|\d+)\s+(?:veces|tomas)\s+(?:al|por|cada)\s+d[ií]a\b/i,
  // "tabletas al día", "una pastilla por noche"
  /\b(?:tabletas?|pastillas?|c[aá]psulas?|comprimidos?|grageas?|gotas|sobres?|cucharadas?|cucharaditas?)\s+(?:al|por|cada|en\s+la)\s+(?:d[ií]a|hora|noche|mañana|tarde)/i,
  /\bdosis\b|\bposolog[ií]a\b|\bmg\s*\/\s*kg\b|\bdosificaci[oó]n\b/i,
  /\bm[aá]xim[oa]\s+(?:de\s+)?\d+/i,
  // Forbidden words and their derivatives ("sustituir", "sustitución"…)
  /sustitu/i,
  /intercambiab/i,
];

/** Questions or answers about medicines (chat): triggers the medicine rules. */
export const MEDICINE_TOPIC =
  /\b(?:medicament|medicina|f[aá]rmac|botica|droguer|pastilla|tableta|c[aá]psula|jarabe|antibi[oó]tic|analg[eé]sic|antigripal|antial[eé]rgic|paracetamol|ibuprofeno|naproxeno|amoxicilina|aspirina|receta m[eé]dica|digemid)/i;

export const MEDICINE_CHAT_NOTICE =
  "Aviso: información referencial, no es una recomendación médica ni un diagnóstico. Cualquier equivalencia entre países es solo un equivalente referencial. Consulta a un químico farmacéutico y verifica el registro en DIGEMID: https://www.digemid.minsa.gob.pe";

/**
 * Chat answers about medicines: drops every sentence that breaks the rules
 * (doses, frequencies, forbidden words) and always appends the fixed notice
 * with the DIGEMID link.
 */
export function enforceMedicineRules(reply: string) {
  const kept = reply
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡-])/)
        .filter(isSafeMedicineText)
        .join(" "),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return kept ? `${kept}\n\n${MEDICINE_CHAT_NOTICE}` : MEDICINE_CHAT_NOTICE;
}

export function isSafeMedicineText(text: string) {
  return !UNSAFE_PATTERNS.some((pattern) => pattern.test(text));
}

/** Returns the trimmed text, or null when it is empty or breaks a rule. */
export function safeMedicineText(text: string | null | undefined) {
  const value = text?.trim();
  if (!value) return null;
  return isSafeMedicineText(value) ? value : null;
}
