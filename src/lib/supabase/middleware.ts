import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminPath, isOnboardingPath, isProtectedPath } from "@/lib/routes";

/**
 * Refreshes the Supabase auth session, keeps request/response cookies in sync
 * and applies route guards. Called from src/proxy.ts (Next.js 16 renamed
 * middleware to proxy).
 *
 * Guards are optimistic redirects for UX. Real authorization lives in RLS and
 * in server code (src/lib/auth.ts).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  let refreshHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          refreshHeaders = headers ?? {};
          Object.entries(refreshHeaders).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims():
  // getClaims() validates the JWT and triggers the token refresh.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const { pathname } = request.nextUrl;
  const isProtected = isProtectedPath(pathname);
  const isLanding = pathname === "/";

  // Redirect while keeping any refreshed session cookies.
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    Object.entries(refreshHeaders).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    return response;
  };

  if (!isProtected && !isLanding) return supabaseResponse;
  if (!userId) return isProtected ? redirectTo("/") : supabaseResponse;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, role")
    .eq("id", userId)
    .maybeSingle();

  // No profile row (trigger missing): let the landing page render.
  if (!profile) return isProtected ? redirectTo("/") : supabaseResponse;

  if (!profile.onboarded) {
    return isOnboardingPath(pathname) ? supabaseResponse : redirectTo("/onboarding");
  }
  // Onboarded users may still open the landing: it shows "Ir a la app".
  if (isOnboardingPath(pathname)) return redirectTo("/inicio");
  if (isAdminPath(pathname) && profile.role !== "admin") return redirectTo("/inicio");

  // Return supabaseResponse as-is so refreshed cookies reach the browser.
  return supabaseResponse;
}
