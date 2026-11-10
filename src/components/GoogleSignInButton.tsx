"use client";

import { useState } from "react";
import { Button, type ButtonSize } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

type GoogleSignInButtonProps = {
  label?: string;
  size?: ButtonSize;
  /** Compact variant for the header: no full width, error shown in a floating note. */
  compact?: boolean;
};

/**
 * Google sign-in. Sign-up is the same flow: the callback sends everyone to
 * /inicio and the proxy redirects first-time users to /onboarding.
 */
export function GoogleSignInButton({
  label = "Entrar con Google",
  size = "lg",
  compact = false,
}: GoogleSignInButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    // On success the browser navigates to Google; only failures land here.
    if (error) {
      setError("No pudimos conectar con Google. Inténtalo de nuevo.");
      setPending(false);
    }
  }

  return (
    <div className={compact ? "relative" : "flex flex-col gap-2"}>
      <Button size={size} className={compact ? "" : "w-full"} onClick={signIn} disabled={pending}>
        <GoogleIcon />
        {pending ? "Conectando…" : label}
      </Button>
      {error && (
        <p
          role="alert"
          className={
            compact
              ? "absolute right-0 top-full mt-2 w-60 rounded-xl border border-border/30 bg-warning-soft p-2 text-sm font-bold text-on-warning-soft shadow-lg"
              : "text-center text-sm font-bold text-on-warning-soft"
          }
        >
          {error}
        </p>
      )}
    </div>
  );
}
