// Generates the 3 app-icon proposals (108×108 maskable grid) + preview sheets.
// Option B was chosen and lives in public/brand/logo-app.svg. Usage: node design/app-icon/generate-proposals.mjs
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(REPO + "package.json");
const sharp = require("sharp");
const OUT = REPO + "design/app-icon/";
await mkdir(OUT, { recursive: true });

const NAVY = "#00105B", LAV = "#6060B6", LILAC = "#CAB5E0", CREAM = "#FCF8EC";
const f = (n) => +n.toFixed(2);

// Bold plane, nose at +x, ~20 long, 20 wingspan (local units).
const PLANE = "M10 0C10-1.7 8.6-2.7 7-2.7L2.5-2.7L-2.5-10L-6.2-10L-3.2-2.7L-6.5-2.7L-8.6-6.2L-10.8-6.2L-9.6 0L-10.8 6.2L-8.6 6.2L-6.5 2.7L-3.2 2.7L-6.2 10L-2.5 10L2.5 2.7L7 2.7C8.6 2.7 10 1.7 10 0Z";
const plane = (x, y, rot, s, fill, stroke) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="${PLANE}" fill="${fill}"${
    stroke ? ` stroke="${NAVY}" stroke-width="${f(3 / s)}" stroke-linejoin="round" paint-order="stroke"` : ""
  }/></g>`;

// Simplified continents in logo-icon space (globe centre 32,32, r 28).
const CONTINENTS = [
  // Americas (from logo-icon.svg)
  "M10 21C14 13.5 25 11 31 15C33.5 18 29.5 22 27.5 25C25.5 28 24.5 30.5 25.5 34C28.5 34.5 31 37.5 30 42.5C29 48 26 53 23 57C20 52 19.5 47 18 43.5C16.5 40.5 17 36.5 19 33.5C15 31.5 11 28.5 10 24.5C9.8 23.3 9.8 22 10 21Z",
  // Europe/Africa block on the right
  "M40 13C45 11.5 52 14 55.5 19C58 23 55 26.5 51 27.5C53.5 30 56 33 55 38C54 43 50 47 47.5 51C45.5 48 44.5 44 42.5 41C40.5 38 38 35.5 39 31.5C40 28 38 25 37.5 21C37 17.5 37.5 14.5 40 13Z",
];
let uid = 0;
const globe = (cx, cy, r, only = CONTINENTS, shift = 0) => {
  const id = `gc${uid++}`;
  const s = f(r / 28);
  return `<defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${LAV}"/>
  <g clip-path="url(#${id})"><g transform="translate(${cx} ${cy}) scale(${s}) translate(${-32 + shift} -32)" fill="${LILAC}">${only.map((d) => `<path d="${d}"/>`).join("")}</g></g>`;
};
// Pin: head centre (x,y), radius r, tip at y + 2.1r.
const pin = (x, y, r, fill, hole, stroke, sw) => {
  const tip = y + 2.1 * r;
  const k = 0.55 * r;
  return `<path d="M${x} ${f(tip)}C${x} ${f(tip)} ${f(x - r)} ${f(y + k)} ${f(x - r)} ${y}A${r} ${r} 0 0 1 ${f(x + r)} ${y}C${f(x + r)} ${f(y + k)} ${x} ${f(tip)} ${x} ${f(tip)}Z" fill="${fill}"${
    stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke"` : ""
  }/>${hole ? `<circle cx="${x}" cy="${y}" r="${f(r * 0.38)}" fill="${hole}"/>` : ""}`;
};
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">\n  <rect width="108" height="108" fill="${NAVY}"/>\n  ${body}\n</svg>\n`;

// Orbit ellipse helpers (centre c, radii rx/ry, rotation deg) -> polyline path between params.
const orbitPath = (cx, cy, rx, ry, rot, t0, t1, steps = 48) => {
  const a = (rot * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const x = rx * Math.cos(t), y = ry * Math.sin(t);
    pts.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  }
  return "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L");
};
const orbitPoint = (cx, cy, rx, ry, rot, t) => {
  const a = (rot * Math.PI) / 180;
  const x = rx * Math.cos(t), y = ry * Math.sin(t);
  const dx = -rx * Math.sin(t), dy = ry * Math.cos(t); // increasing t
  return {
    x: f(cx + x * Math.cos(a) - y * Math.sin(a)),
    y: f(cy + x * Math.sin(a) + y * Math.cos(a)),
    ang: f((Math.atan2(dx * Math.sin(a) + dy * Math.cos(a), dx * Math.cos(a) - dy * Math.sin(a)) * 180) / Math.PI),
  };
};

// ---------- Option A: globe + pin + plane ----------
const A = svg(`${globe(49, 58, 26)}
  ${pin(65, 47, 11.5, CREAM, NAVY, NAVY, 3.5)}
  ${plane(79, 27, -35, 0.82, CREAM)}`);

// ---------- Option B: A + orbit ----------
const O = { cx: 51, cy: 57, rx: 37, ry: 11.5, rot: -22 };
// Param runs from the left end (π) down under the globe (π/2 is the bottom in local space…) — we
// go t: π → 2π is the top (back) half, 0 → π the bottom (front) half. Front goes right→left
// as t increases, so the plane sits near t≈0.45 heading toward decreasing t (up-right).
const pB = orbitPoint(O.cx, O.cy, O.rx, O.ry, O.rot, 0.2);
const B = svg(`<path d="${orbitPath(O.cx, O.cy, O.rx, O.ry, O.rot, Math.PI, 2 * Math.PI - 0.05)}" fill="none" stroke="${LILAC}" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>
  ${globe(O.cx, O.cy, 22)}
  <path d="${orbitPath(O.cx, O.cy, O.rx, O.ry, O.rot, 0.62, Math.PI)}" fill="none" stroke="${LILAC}" stroke-width="4" stroke-linecap="round"/>
  ${pin(61, 45, 10, CREAM, NAVY, NAVY, 3.2)}
  ${plane(pB.x, pB.y - 3, -40, 0.8, CREAM, true)}`);

// ---------- Option C: big pin with small globe inside the head ----------
const C = svg(`${pin(52, 47, 22.5, CREAM)}
  <circle cx="52" cy="47" r="17" fill="${NAVY}"/>
  ${globe(52, 47, 15, [CONTINENTS[0]], 9)}
  ${plane(76, 25, -30, 0.8, LILAC, true)}`);

const options = { a: A, b: B, c: C };
for (const [k, s] of Object.entries(options)) await writeFile(`${OUT}option-${k}.svg`, s);

// ---------- Preview sheets ----------
const SIZES = [192, 96, 48];
const squircle = (n = 4, steps = 160) => {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const c = Math.cos(t), s = Math.sin(t);
    pts.push([0.5 + 0.5 * Math.sign(c) * Math.abs(c) ** (2 / n), 0.5 + 0.5 * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return pts;
};
const SQ = squircle(4.2);
const MASKS = [
  { name: "Círculo (Pixel)", shape: (x, y, d) => `<circle cx="${x + d / 2}" cy="${y + d / 2}" r="${d / 2}"/>` },
  { name: "Squircle (Samsung)", shape: (x, y, d) => `<path d="M${SQ.map(([a, b]) => `${f(x + a * d)} ${f(y + b * d)}`).join("L")}Z"/>` },
  { name: "Cuadrado redondeado (iPhone)", shape: (x, y, d) => `<rect x="${x}" y="${y}" width="${d}" height="${d}" rx="${f(d * 0.2237)}"/>` },
  { name: "Sin máscara · zona segura 80 % punteada", shape: (x, y, d) => `<rect x="${x}" y="${y}" width="${d}" height="${d}"/>`, guide: true },
];

async function sheet(key, src) {
  const pngs = {};
  for (const s of SIZES) pngs[s] = (await sharp(Buffer.from(src), { density: (72 * s) / 108 * 4 }).resize(s, s).png().toBuffer()).toString("base64");
  const GAP = 36, PADX = 32, LABEL = 30, TOP = 70;
  const panelW = PADX * 2 + SIZES.reduce((a, b) => a + b, 0) + GAP * (SIZES.length - 1);
  const rowH = LABEL + 192 + 24;
  const H = TOP + 40 + MASKS.length * rowH + 10;
  const W = panelW * 2;
  const font = 'font-family="Segoe UI, Arial, sans-serif"';
  let out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">`;
  out += `<rect width="${W}" height="${H}" fill="#F2F2F2"/><rect x="${panelW}" width="${panelW}" height="${H}" fill="#121212"/>`;
  out += `<text x="${PADX}" y="44" ${font} font-size="26" font-weight="700" fill="#111">Opción ${key.toUpperCase()}</text>`;
  [["Fondo claro", "#111", 0], ["Fondo oscuro", "#EEE", panelW]].forEach(([t, c, ox]) => {
    out += `<text x="${ox + PADX}" y="${TOP + 24}" ${font} font-size="17" font-weight="600" fill="${c}">${t} — 192 · 96 · 48 px</text>`;
    MASKS.forEach((m, r) => {
      const y0 = TOP + 40 + r * rowH;
      out += `<text x="${ox + PADX}" y="${y0 + 20}" ${font} font-size="14" fill="${c}" fill-opacity="0.75">${m.name}</text>`;
      let x = ox + PADX;
      for (const s of SIZES) {
        const y = y0 + LABEL + (192 - s) / 2;
        const id = `m${key}${ox}${r}${s}`;
        out += `<clipPath id="${id}">${m.shape(x, y, s)}</clipPath>`;
        out += `<image x="${x}" y="${y}" width="${s}" height="${s}" clip-path="url(#${id})" xlink:href="data:image/png;base64,${pngs[s]}"/>`;
        if (m.guide) out += `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 0.4}" fill="none" stroke="#FF4D4D" stroke-width="1" stroke-dasharray="4 3"/>`;
        x += s + GAP;
      }
    });
  });
  out += "</svg>";
  await sharp(Buffer.from(out)).png().toFile(`${OUT}preview-${key}.png`);
}
for (const [k, s] of Object.entries(options)) await sheet(k, s);
// Also a 512 render of each for close inspection.
for (const [k, s] of Object.entries(options)) await sharp(Buffer.from(s), { density: 72 * 512 / 108 * 2 }).resize(512, 512).png().toFile(`${OUT}option-${k}-512.png`);
console.log("ok");
