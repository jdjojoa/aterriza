// Generates public/qr-aterriza.png pointing to the public site URL.
// Usage: npm run qr                 (reads NEXT_PUBLIC_SITE_URL from env or .env.local)
//        npm run qr -- https://...  (explicit URL)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const root = new URL("../", import.meta.url);

async function siteUrlFromEnvFile() {
  try {
    const env = await readFile(new URL(".env.local", root), "utf8");
    const match = env.match(/^NEXT_PUBLIC_SITE_URL=(.*)$/m);
    return match?.[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

const url = process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || (await siteUrlFromEnvFile());
if (!url) {
  console.error("Falta NEXT_PUBLIC_SITE_URL (o pasa la URL como argumento).");
  process.exit(1);
}
new URL(url); // Throws on an invalid URL.

if (/localhost|127\.0\.0\.1/.test(url)) {
  console.warn(`Aviso: el QR apunta a ${url}; los teléfonos no podrán abrirlo.`);
}

// High error correction so the logo drawn over the centre (/qr page) stays scannable.
await QRCode.toFile(fileURLToPath(new URL("public/qr-aterriza.png", root)), url, {
  errorCorrectionLevel: "H",
  margin: 2,
  width: 1024,
  color: { dark: "#00105B", light: "#FFFFFF" },
});

console.log(`QR escrito en public/qr-aterriza.png → ${url}`);
