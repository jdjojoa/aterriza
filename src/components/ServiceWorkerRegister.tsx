"use client";

import { useEffect } from "react";

/** Registers public/sw.js. Production only, so dev never serves stale pages. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Registration failure only disables offline support; the app keeps working.
      });
  }, []);

  return null;
}
