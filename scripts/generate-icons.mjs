// Generates every app icon from public/brand/logo-icon.svg (globe + pin) and the
// Open Graph image from public/brand/logo-full.svg. Run `npm run logo` first.
// Usage: npm run icons
// Outputs:
//   public/icons/icon-192.png, icon-512.png   transparent corners, "any" purpose
//   public/icons/icon-maskable-512.png        navy full-bleed, logo inside the 80% safe zone
//   src/app/icon.png (512)                    <link rel="icon"> fallback for icon.svg
//   src/app/apple-icon.png (180)              iOS home screen (no transparency allowed)
//   src/app/favicon.ico (16/32/48)            browser tab
//   src/app/opengraph-image.png (1200×630)    link previews (WhatsApp, redes)
// After changing icons, bump ICONS_VERSION in src/app/manifest.ts and VERSION in public/sw.js.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const NAVY = "#00105B";
const LAVENDER = "#6060B6";
const CREAM = "#FCF8EC";

const root = new URL("../", import.meta.url);
const logo = await readFile(new URL("public/brand/logo-icon.svg", root));
const fullLogo = await readFile(new URL("public/brand/logo-full.svg", root));
const iconsDir = new URL("public/icons/", root);
const appDir = new URL("src/app/", root);
await mkdir(iconsDir, { recursive: true });

const path = (dir, name) => fileURLToPath(new URL(name, dir));

/** Icon alone (globe + pin, transparent corners). */
const plain = (size) =>
  sharp(logo, { density: 72 * (size / 64) * 2 }).resize(size, size).png().toBuffer();

/** Logo centred on a full-bleed navy square, scaled to `scale` of the side. */
const onNavy = (size, scale) => {
  const inner = logo
    .toString()
    .replace(/<svg[^>]*>/, "")
    .replace("</svg>", "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${NAVY}"/>
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${inner}</g>
</svg>`;
  return sharp(Buffer.from(svg), { density: 72 * (size / 64) * 2 }).resize(size, size).png().toBuffer();
};

/** ICO container with embedded PNG images (supported by every current browser). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2); // palette
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

await writeFile(path(iconsDir, "icon-192.png"), await plain(192));
await writeFile(path(iconsDir, "icon-512.png"), await plain(512));
// Maskable: the safe zone is a circle of 80% diameter; the globe (56/64 of the
// icon) scaled by 0.86 fills 75%.
await writeFile(path(iconsDir, "icon-maskable-512.png"), await onNavy(512, 0.86));

await writeFile(path(appDir, "icon.png"), await plain(512));
await writeFile(path(appDir, "apple-icon.png"), await onNavy(180, 0.9));

const favicon = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await plain(size) })));
await writeFile(path(appDir, "favicon.ico"), ico(favicon));

/** 1200×630 link preview: full logo and name on cream. */
async function openGraph() {
  const art = await sharp(fullLogo, { density: 72 * (440 / 64) * 2 }).resize(440, 440).png().toBuffer();
  const font = 'font-family="Nunito, Segoe UI, Arial, sans-serif"';
  const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${CREAM}"/>
  <rect y="606" width="1200" height="24" fill="${LAVENDER}"/>
  <text x="590" y="290" ${font} font-size="120" font-weight="900" fill="${NAVY}">Aterriza</text>
  <text x="596" y="364" ${font} font-size="40" font-weight="700" fill="${NAVY}">Tu guía para llegar a Piura</text>
  <text x="596" y="420" ${font} font-size="32" font-weight="700" fill="${LAVENDER}">Colombia → Piura, Perú</text>
</svg>`;
  return sharp(Buffer.from(card)).composite([{ input: art, left: 110, top: 95 }]).png().toBuffer();
}
await writeFile(path(appDir, "opengraph-image.png"), await openGraph());

console.log("Icons written to public/icons and src/app (favicon.ico, icon.png, apple-icon.png, opengraph-image.png)");
