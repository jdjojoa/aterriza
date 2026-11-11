// Verifies WCAG AA contrast for every token pair used in the UI.
// Text pairs need >= 4.5; UI boundaries (borders, focus rings, icons) need >= 3.
// Usage: node scripts/check-contrast.mjs
// Brand palette: navy #00105B · lavender #6060B6 · lilac #CAB5E0 · cream #FCF8EC.
const themes = {
  light: {
    background: "#FCF8EC", surface: "#FFFFFF", foreground: "#1A1F4D", heading: "#00105B",
    muted: "#3F4166", border: "#6E6F92", primary: "#00105B", primaryHover: "#1B2A80",
    primaryEdge: "#6060B6", onPrimary: "#FCF8EC", accent: "#6060B6", accentSoft: "#CAB5E0",
    onAccentSoft: "#00105B", hover: "#F0E9F7", warningSoft: "#FFF4D6", onWarningSoft: "#7A4A00",
    link: "#4F4FA6", ring: "#6060B6", warning: "#A16207", danger: "#C81E1E",
    dangerSoft: "#FDE4E4", onDangerSoft: "#8B1111",
  },
  dark: {
    background: "#000A3D", surface: "#00105B", foreground: "#FCF8EC", heading: "#CAB5E0",
    muted: "#C4C2E0", border: "#8F92CC", primary: "#6060B6", primaryHover: "#5252A8",
    primaryEdge: "#CAB5E0", onPrimary: "#FFFFFF", accent: "#CAB5E0", accentSoft: "#2B2F80",
    onAccentSoft: "#FCF8EC", hover: "#1A2680", warningSoft: "#3A2E10", onWarningSoft: "#FFE3A3",
    link: "#CAB5E0", ring: "#CAB5E0", warning: "#FACC15", danger: "#FF8A8A",
    dangerSoft: "#4A0E1E", onDangerSoft: "#FFC9C9",
  },
};

const text = [
  ["foreground", "background"], ["foreground", "surface"],
  ["heading", "background"], ["heading", "surface"],
  ["muted", "background"], ["muted", "surface"],
  ["onPrimary", "primary"], ["onPrimary", "primaryHover"],
  ["primary", "onPrimary"], // Inverted buttons inside the /inicio photo card
  ["onAccentSoft", "accentSoft"], ["muted", "accentSoft"],
  ["onWarningSoft", "warningSoft"],
  ["onWarningSoft", "surface"], ["onWarningSoft", "background"], // Input error text
  ["muted", "hover"], // ThemeToggle unselected icon on hover
  ["foreground", "hover"], ["heading", "hover"],
  ["link", "background"], ["link", "surface"], ["link", "hover"],
  ["accent", "background"], ["accent", "surface"],
  ["onDangerSoft", "dangerSoft"], // Red alert in /admin
];
const ui = [
  ["border", "background"], ["border", "surface"],
  ["primaryEdge", "background"], ["primaryEdge", "surface"],
  ["primary", "background"], ["primary", "surface"], // Filled buttons
  ["ring", "background"], ["ring", "surface"],
  ["accent", "hover"], // Icons on hovered rows
  // Gemini quota ring and hourly bars in /admin
  ["warning", "surface"], ["danger", "surface"], // ring track: hover
  ["warning", "hover"], ["danger", "hover"],
];

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

let failed = 0;
for (const [name, t] of Object.entries(themes)) {
  for (const [pairs, min] of [[text, 4.5], [ui, 3]]) {
    for (const [fg, bg] of pairs) {
      const r = ratio(t[fg], t[bg]);
      const ok = r >= min;
      if (!ok) failed++;
      console.log(`${ok ? "OK  " : "FAIL"} ${name.padEnd(5)} ${`${fg}/${bg}`.padEnd(28)} ${r.toFixed(2)} (min ${min})`);
    }
  }
}
process.exit(failed ? 1 : 0);
