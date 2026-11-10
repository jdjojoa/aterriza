export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
const THEME_EVENT = "aterriza:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Inline script injected in <head>. Runs during HTML parsing, before the
 * first paint, so the stored theme never flashes. With no stored choice
 * (first visit) it follows the system preference.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("${DARK_QUERY}").matches);var c=document.documentElement.classList;d?c.add("dark"):c.remove("dark")}catch(e){}})()`;

/** The user's explicit choice, or null when they never picked one. */
function readStoredMode(): ThemeMode | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    // Old builds could store "system": treat it like no choice.
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function systemMode(): ThemeMode {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Effective theme: the stored choice, else the system preference. */
export function readThemeMode(): ThemeMode {
  return readStoredMode() ?? systemMode();
}

export function applyThemeMode(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
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
  const media = window.matchMedia(DARK_QUERY);
  // Until the user picks a theme, keep following the system preference.
  const onMedia = () => {
    if (readStoredMode() === null) applyThemeMode(systemMode());
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
