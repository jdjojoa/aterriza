"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallMode = "hidden" | "prompt" | "ios";

// Module-level store: beforeinstallprompt can fire before this component mounts.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function getMode(): InstallMode {
  if (isStandalone()) return "hidden";
  if (deferredPrompt) return "prompt";
  if (isIos()) return "ios";
  return "hidden";
}

/** "Instalar app": native prompt on Android/Chrome, step-by-step help on iPhone. */
export function InstallAppButton({ className }: { className?: string }) {
  const mode = useSyncExternalStore(subscribe, getMode, () => "hidden" as const);
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (mode === "hidden") return null;

  async function install() {
    if (mode === "ios") {
      setShowIosHelp(true);
      return;
    }
    const prompt = deferredPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    // A prompt can only be used once.
    deferredPrompt = null;
    emit();
  }

  return (
    <>
      <Button variant="secondary" size="lg" className={className} onClick={install}>
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        Instalar app
      </Button>

      <BottomSheet
        open={showIosHelp}
        onClose={() => setShowIosHelp(false)}
        title="Instalar en iPhone"
      >
        <ol className="flex flex-col gap-3 text-foreground">
          <li className="flex items-start gap-3">
            <Step n={1} />
            <span>
              Abre esta página en <strong>Safari</strong> y toca el botón{" "}
              <strong>Compartir</strong>{" "}
              <ShareIcon />
              {" "}(abajo en la pantalla, o arriba en iPad).
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Step n={2} />
            <span>
              Desliza y elige <strong>Añadir a pantalla de inicio</strong>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Step n={3} />
            <span>
              Toca <strong>Añadir</strong>. Aterriza aparecerá como una app en tu
              pantalla de inicio.
            </span>
          </li>
        </ol>
        <Button size="lg" onClick={() => setShowIosHelp(false)}>
          Entendido
        </Button>
      </BottomSheet>
    </>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-extrabold text-on-accent-soft"
    >
      {n}
    </span>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline align-text-bottom"
    >
      <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
