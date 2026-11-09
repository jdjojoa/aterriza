"use client";

import { useSearchParams } from "next/navigation";

/** Shows the error the OAuth callback sends back as /?error=auth. */
export function AuthErrorNotice() {
  const error = useSearchParams().get("error");
  if (error !== "auth") return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-warning-soft p-3 text-center text-sm font-bold text-on-warning-soft"
    >
      No pudimos iniciar tu sesión. Inténtalo de nuevo.
    </p>
  );
}
