/** Top-level paths of the (app) route group. Route groups do not appear in URLs. */
export const APP_PATHS = [
  "/inicio",
  "/transporte",
  "/lugares",
  "/moneda",
  "/jerga",
  "/costumbres",
  "/aportes",
  "/identificar",
  "/chat",
  "/perfil",
] as const;

function matches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Paths that require a signed-in user. */
export function isProtectedPath(pathname: string) {
  return (
    APP_PATHS.some((base) => matches(pathname, base)) ||
    matches(pathname, "/onboarding") ||
    matches(pathname, "/admin")
  );
}

export function isAdminPath(pathname: string) {
  return matches(pathname, "/admin");
}

export function isOnboardingPath(pathname: string) {
  return matches(pathname, "/onboarding");
}
