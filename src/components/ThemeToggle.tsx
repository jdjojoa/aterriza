"use client";

import { useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  applyThemeMode,
  readThemeMode,
  setThemeMode,
  subscribeThemeMode,
  type ThemeMode,
} from "@/lib/theme";

const OPTIONS: { mode: ThemeMode; label: string; icon: ReactNode }[] = [
  {
    mode: "system",
    label: "Sistema",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  },
  {
    mode: "light",
    label: "Claro",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    mode: "dark",
    label: "Oscuro",
    icon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  },
];

export function ThemeToggle() {
  const mode = useSyncExternalStore(
    subscribeThemeMode,
    readThemeMode,
    () => "system" as ThemeMode,
  );

  // React's dev remount resets <html> attributes; re-apply before paint.
  useLayoutEffect(() => {
    applyThemeMode(readThemeMode());
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Tema de color"
      className="inline-flex rounded-full border border-border bg-surface p-1"
    >
      {OPTIONS.map((option) => {
        const selected = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => setThemeMode(option.mode)}
            className={`inline-flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              selected
                ? "bg-primary text-on-primary"
                : "text-muted hover:bg-hover hover:text-heading"
            }`}
          >
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
            >
              {option.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
