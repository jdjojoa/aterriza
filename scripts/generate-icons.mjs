// Generates PWA icons from public/logo.svg.
// Usage: node scripts/generate-icons.mjs
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const logo = await readFile(new URL("public/logo.svg", root));
const outDir = new URL("public/icons/", root);
await mkdir(outDir, { recursive: true });

for (const size of [192, 512]) {
  await sharp(logo, { density: 72 * (size / 64) })
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(`icon-${size}.png`, outDir)));
}

// Maskable: full-bleed lilac square (brand lilac, see globals.css), logo content kept inside the 80% safe zone.
const inner = logo
  .toString()
  .replace(/<svg[^>]*>/, "")
  .replace("</svg>", "")
  .replace(/<circle[^>]*\/>/, "");
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#CAB5E0"/>
  <g transform="translate(32 32) scale(0.7) translate(-32 -32)">${inner}</g>
</svg>`;

await sharp(Buffer.from(maskable), { density: 72 * 8 })
  .resize(512, 512)
  .png()
  .toFile(fileURLToPath(new URL("icon-maskable-512.png", outDir)));

console.log("Icons written to public/icons");
