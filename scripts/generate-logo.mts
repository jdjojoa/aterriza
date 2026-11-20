// Writes the static logo files from src/components/logo/geometry.ts.
// Usage: npm run logo   (then npm run icons and npm run qr)
// Outputs:
//   public/brand/logo-full.svg, logo-full-dark.svg   detailed logo
//   public/brand/logo-mark.svg, logo-mark-dark.svg   header logo (bolder)
//   public/brand/logo-icon.svg                       globe + pin (works on light and dark)
//   public/logo.svg                                  = logo-mark.svg (precached by public/sw.js)
// Every piece is a group with an id (orbit-back, globe, continents, orbit, pin, plane)
// so the files can be animated with CSS.
// The browser-tab icon (src/app/icon.svg) is not generated here: it is a copy of
// public/brand/logo-favicon.svg written by npm run icons.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  GLOBE,
  GRID,
  ICON,
  LAND,
  LAND_COPIES,
  LAND_PERIOD,
  ORBIT_BACK,
  ORBIT_FRONT,
  PIN,
  PLANE,
  PLANE_REST,
  SHADE,
  STROKE,
} from "../src/components/logo/geometry";

// Brand palette (src/app/globals.css). Hex here because standalone SVGs have no CSS variables.
const NAVY = "#00105B";
const LAVENDER = "#6060B6";
const LILAC = "#CAB5E0";
const CREAM = "#FCF8EC";

type Theme = "light" | "dark";
/** Orbit and plane: navy on light backgrounds, lilac on dark ones (like the `heading` token). */
const ink = (theme: Theme) => (theme === "light" ? NAVY : LILAC);

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Aterriza">\n${body}\n</svg>\n`;

function full(variant: "full" | "mark", theme: Theme) {
  const s = STROKE[variant];
  const copy = LAND[variant].map((d) => `<path d="${d}"/>`).join("");
  const copies = Array.from({ length: LAND_COPIES }, (_, i) =>
    i ? `<g transform="translate(${i * LAND_PERIOD} 0)">${copy}</g>` : `<g>${copy}</g>`,
  ).join("\n        ");
  const grid =
    variant === "full"
      ? GRID.map(
          (e) =>
            `\n    <ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="none" stroke="${LILAC}" stroke-opacity="0.4" stroke-width="0.6"/>`,
        ).join("")
      : "";
  const shade =
    variant === "full"
      ? `\n      <path d="${SHADE}" fill-rule="evenodd" fill="${NAVY}" fill-opacity="0.18"/>`
      : "";
  return svg(`  <defs><clipPath id="globe-clip"><circle cx="${GLOBE.cx}" cy="${GLOBE.cy}" r="${GLOBE.r}"/></clipPath></defs>
  <g id="orbit-back">
    <path d="${ORBIT_BACK}" fill="none" stroke="${ink(theme)}" stroke-opacity="0.45" stroke-width="${s.orbitBack}" stroke-linecap="round"/>
  </g>
  <g id="globe">
    <circle cx="${GLOBE.cx}" cy="${GLOBE.cy}" r="${GLOBE.r}" fill="${LAVENDER}"/>
    <g clip-path="url(#globe-clip)">
      <g id="continents" fill="${LILAC}">
        ${copies}
      </g>${shade}
    </g>${grid}
  </g>
  <g id="orbit">
    <path d="${ORBIT_FRONT}" fill="none" stroke="${ink(theme)}" stroke-width="${s.orbit}" stroke-linecap="round"/>
  </g>
  <g id="pin">
    <path d="${PIN.d}" fill="${NAVY}" stroke="${CREAM}" stroke-width="${s.pin}" stroke-linejoin="round"/>
    <circle cx="${PIN.hole.cx}" cy="${PIN.hole.cy}" r="${PIN.hole.r}" fill="${CREAM}"/>
  </g>
  <g id="plane" transform="${PLANE_REST}">
    <path d="${PLANE}" fill="${ink(theme)}"/>
  </g>`);
}

function icon() {
  const { globe, land, pin } = ICON;
  return svg(`  <g id="globe">
    <circle cx="${globe.cx}" cy="${globe.cy}" r="${globe.r}" fill="${LAVENDER}"/>
    <g id="continents" fill="${LILAC}">${land.map((d) => `<path d="${d}"/>`).join("")}</g>
  </g>
  <g id="pin">
    <path d="${pin.d}" fill="${NAVY}" stroke="${CREAM}" stroke-width="${STROKE.icon.pin}" stroke-linejoin="round"/>
    <circle cx="${pin.hole.cx}" cy="${pin.hole.cy}" r="${pin.hole.r}" fill="${CREAM}"/>
  </g>`);
}

const root = new URL("../", import.meta.url);
const out = (name: string) => fileURLToPath(new URL(name, root));

const files: Record<string, string> = {
  "public/brand/logo-full.svg": full("full", "light"),
  "public/brand/logo-full-dark.svg": full("full", "dark"),
  "public/brand/logo-mark.svg": full("mark", "light"),
  "public/brand/logo-mark-dark.svg": full("mark", "dark"),
  "public/brand/logo-icon.svg": icon(),
  "public/logo.svg": full("mark", "light"),
};

for (const [name, content] of Object.entries(files)) {
  await writeFile(out(name), content);
}
console.log(`Logo written: ${Object.keys(files).join(", ")}`);
