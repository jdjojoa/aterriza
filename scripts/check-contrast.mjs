// Verifies WCAG AA contrast for every token pair used in the UI.
// Text pairs need >= 4.5; UI boundaries (borders, focus rings) need >= 3.
// Usage: node scripts/check-contrast.mjs
const themes = {
  light: {
    background: "#F5FBE3", surface: "#FFFFFF", foreground: "#1B2A3A", heading: "#1B3A66",
    muted: "#4A5A6B", border: "#6B7B8C", primary: "#B5D275", primaryHover: "#A3C35C",
    primaryEdge: "#5E7F22", onPrimary: "#1B3A66", accentSoft: "#E3F0C4", onAccentSoft: "#1B3A66",
    hover: "#E9F3CF", warningSoft: "#FFF4D6", onWarningSoft: "#7A4A00", link: "#1B3A66", ring: "#1B3A66",
  },
  dark: {
    background: "#0E1F38", surface: "#1B3A66", foreground: "#EAF5D3", heading: "#B5D275",
    muted: "#C3D1B0", border: "#8AA6CF", primary: "#B5D275", primaryHover: "#C6DE8E",
    primaryEdge: "#B5D275", onPrimary: "#1B3A66", accentSoft: "#2C4A1E", onAccentSoft: "#EAF5D3",
    hover: "#24477A", warningSoft: "#3A2E10", onWarningSoft: "#FFE3A3", link: "#B5D275", ring: "#B5D275",
  },
};

const text = [
  ["foreground", "background"], ["foreground", "surface"],
  ["heading", "background"], ["heading", "surface"],
  ["muted", "background"], ["muted", "surface"],
  ["onPrimary", "primary"], ["onPrimary", "primaryHover"],
  ["onAccentSoft", "accentSoft"], ["muted", "accentSoft"],
  ["onWarningSoft", "warningSoft"],
  ["onWarningSoft", "surface"], ["onWarningSoft", "background"], // Input error text
  ["muted", "hover"], // ThemeToggle unselected icon on hover
  ["foreground", "hover"], ["heading", "hover"],
  ["link", "background"], ["link", "surface"],
];
const ui = [
  ["border", "background"], ["border", "surface"],
  ["primaryEdge", "background"], ["primaryEdge", "surface"],
  ["ring", "background"], ["ring", "surface"],
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
