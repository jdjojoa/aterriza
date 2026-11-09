import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback: Google -> Supabase -> here with ?code=...
 * Exchanges the code for a session (stored in cookies) and sends the user on.
 * The proxy then decides between /onboarding and /inicio.
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/inicio", baseUrl));
    console.error("auth callback: code exchange failed", error.message);
  }

  return NextResponse.redirect(new URL("/?error=auth", baseUrl));
}
