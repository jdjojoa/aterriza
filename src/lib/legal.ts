/** Legal pages (public) and the terms acceptance stored in profiles.terms_accepted_at. */
export const PRIVACY_PATH = "/privacidad";
export const TERMS_PATH = "/terminos";
/** One-time acceptance for users created before the checkbox existed. */
export const ACCEPT_TERMS_PATH = "/aceptar-terminos";

/** Name of the required checkbox in the onboarding and acceptance forms. */
export const ACCEPT_TERMS_FIELD = "accept_terms";

export const ACCEPT_TERMS_ERROR =
  "Para continuar, confirma que tienes 18 años o más y aceptas los Términos de uso y la Política de privacidad.";

export function acceptedTerms(formData: FormData) {
  return formData.get(ACCEPT_TERMS_FIELD) === "on";
}

/** Under the chat box and the photo pickers (Gemini free tier, see /privacidad). */
export const PERSONAL_DATA_NOTICE = "No escribas ni fotografíes datos personales (nombres, documentos, direcciones)";
