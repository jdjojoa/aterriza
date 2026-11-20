// Favicon candidates from app-icon option B + a 16/32 px comparison sheet in browser tabs.
// Usage: node design/favicon/generate-favicons.mjs
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(REPO + "package.json");
const sharp = require("sharp");
const OUT = REPO + "design/favicon/";
await mkdir(OUT, { recursive: true });

const NAVY = "#00105B", LAV = "#6060B6", LILAC = "#CAB5E0", CREAM = "#FCF8EC";
const f = (n) => +n.toFixed(2);

// ---------- Simplified B (32×32 grid, built for 16–48 px): no continents, thick orbit ----------
const PLANE = "M10 0C10-1.7 8.6-2.7 7-2.7L2.5-2.7L-2.5-10L-6.2-10L-3.2-2.7L-6.5-2.7L-8.6-6.2L-10.8-6.2L-9.6 0L-10.8 6.2L-8.6 6.2L-6.5 2.7L-3.2 2.7L-6.2 10L-2.5 10L2.5 2.7L7 2.7C8.6 2.7 10 1.7 10 0Z";
const ellipseArc = (cx, cy, rx, ry, rot, t0, t1, steps = 40) => {
  const a = (rot * Math.PI) / 180, pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps, x = rx * Math.cos(t), y = ry * Math.sin(t);
    pts.push(`${f(cx + x * Math.cos(a) - y * Math.sin(a))} ${f(cy + x * Math.sin(a) + y * Math.cos(a))}`);
  }
  return "M" + pts.join("L");
};
const pin = (x, y, r, sw) => {
  const tip = y + 2.1 * r, k = 0.55 * r;
  return `<path d="M${x} ${f(tip)}C${x} ${f(tip)} ${f(x - r)} ${f(y + k)} ${f(x - r)} ${y}A${r} ${r} 0 0 1 ${f(x + r)} ${y}C${f(x + r)} ${f(y + k)} ${x} ${f(tip)} ${x} ${f(tip)}Z" fill="${CREAM}" stroke="${NAVY}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke"/><circle cx="${x}" cy="${y}" r="${f(r * 0.4)}" fill="${NAVY}"/>`;
};
const G = { cx: 15, cy: 18.5, r: 8.6 };
const O = { rx: 12.8, ry: 4.2, rot: -22 };
const simple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${NAVY}"/>
  <circle cx="${G.cx}" cy="${G.cy}" r="${G.r}" fill="${LAV}"/>
  <path d="${ellipseArc(G.cx, G.cy, O.rx, O.ry, O.rot, 0.5, Math.PI)}" fill="none" stroke="${NAVY}" stroke-width="4.4" stroke-linecap="round"/>
  <path d="${ellipseArc(G.cx, G.cy, O.rx, O.ry, O.rot, 0.5, Math.PI)}" fill="none" stroke="${LILAC}" stroke-width="2.4" stroke-linecap="round"/>
  ${pin(18.5, 12.2, 4.5, 1.4)}
  <g transform="translate(26.2 6.4) rotate(-40) scale(0.34)"><path d="${PLANE}" fill="${CREAM}" stroke="${NAVY}" stroke-width="3" stroke-linejoin="round" paint-order="stroke"/></g>
</svg>
`;
await writeFile(OUT + "favicon-b-simple.svg", simple);

const sources = {
  actual: { label: "Actual", svg: await readFile(REPO + "src/app/icon.svg"), box: 64 },
  b: { label: "B tal cual", svg: await readFile(REPO + "public/brand/logo-app.svg"), box: 108 },
  simple: { label: "B simplificada", svg: Buffer.from(simple), box: 32 },
};
const render = (src, size) =>
  sharp(src.svg, { density: Math.max(72, (72 * size * 4) / src.box) }).resize(size, size).png().toBuffer();

// ICO with embedded PNGs.
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size, e); header.writeUInt8(size, e + 1);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}
for (const k of ["b", "simple"]) {
  const name = k === "b" ? "b" : "b-simple";
  const pngs = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await render(sources[k], size) })));
  await writeFile(`${OUT}favicon-${name}.ico`, ico(pngs));
  await writeFile(`${OUT}icon-${name}.png`, await render(sources[k], 512));
}

// ---------- Comparison sheet ----------
const b64 = (buf) => `data:image/png;base64,${buf.toString("base64")}`;
const font = 'font-family="Segoe UI, Arial, sans-serif"';
const THEMES = [
  { name: "Pestaña clara", bar: "#DEE1E6", tab: "#FFFFFF", text: "#1F1F1F", label: "#111" },
  { name: "Pestaña oscura", bar: "#202124", tab: "#35363A", text: "#E8EAED", label: "#EEE" },
];
const ZOOM = 6;
const W = 1040, PANEL = 300;
let body = "";
let y = 20;
body += `<text x="24" y="${y + 22}" ${font} font-size="24" font-weight="700" fill="#111">Favicon: actual vs. B vs. B simplificada</text>`;
y += 50;
for (const th of THEMES) {
  const top = y;
  const h = 40 + Object.keys(sources).length * 150 + 10;
  body += `<rect x="0" y="${top}" width="${W}" height="${h}" fill="${th.bar}"/>`;
  body += `<text x="24" y="${top + 28}" ${font} font-size="17" font-weight="600" fill="${th.label}">${th.name} — 16 px (pestaña), 32 px (pantallas HiDPI / marcadores) y zoom ×${ZOOM} del de 16 px</text>`;
  let ry = top + 46;
  for (const src of Object.values(sources)) {
    const p16 = await render(src, 16), p32 = await render(src, 32);
    const zoom = await sharp(p16).resize(16 * ZOOM, 16 * ZOOM, { kernel: "nearest" }).png().toBuffer();
    body += `<text x="24" y="${ry + 18}" ${font} font-size="15" font-weight="600" fill="${th.label}">${src.label}</text>`;
    // 16 px tab
    body += `<rect x="24" y="${ry + 30}" width="240" height="34" rx="8" fill="${th.tab}"/>`;
    body += `<image x="36" y="${ry + 39}" width="16" height="16" href="${b64(p16)}"/>`;
    body += `<text x="62" y="${ry + 52}" ${font} font-size="13" fill="${th.text}">Aterriza — Tu guía para…</text>`;
    // 32 px tab (2× scale mock)
    body += `<rect x="290" y="${ry + 30}" width="400" height="56" rx="12" fill="${th.tab}"/>`;
    body += `<image x="304" y="${ry + 42}" width="32" height="32" href="${b64(p32)}"/>`;
    body += `<text x="348" y="${ry + 64}" ${font} font-size="20" fill="${th.text}">Aterriza — Tu guía para…</text>`;
    // zoom
    body += `<rect x="${W - PANEL + 120}" y="${ry + 4}" width="${16 * ZOOM + 16}" height="${16 * ZOOM + 16}" rx="8" fill="${th.tab}"/>`;
    body += `<image x="${W - PANEL + 128}" y="${ry + 12}" width="${16 * ZOOM}" height="${16 * ZOOM}" href="${b64(zoom)}"/>`;
    ry += 150;
  }
  y = top + h + 20;
}
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}"><rect width="${W}" height="${y}" fill="#F7F7F7"/>${body}</svg>`;
await sharp(Buffer.from(sheet)).png().toFile(OUT + "comparison.png");
console.log("ok");
