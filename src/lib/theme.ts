export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
const THEME_EVENT = "aterriza:theme";

/**
 * Inline script injected in <head>. Runs during HTML parsing, before the
 * first paint, so the stored theme never flashes.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;d?c.add("dark"):c.remove("dark")}catch(e){}})()`;

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function readThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyThemeMode(mode: ThemeMode) {
  const dark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Storage unavailable (private mode): still apply for this session.
  }
  applyThemeMode(mode);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeThemeMode(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (readThemeMode() === "system") applyThemeMode("system");
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyThemeMode(readThemeMode());
    onChange();
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onMedia);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onMedia);
  };
}
