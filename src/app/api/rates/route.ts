import { connection } from "next/server";
import { getPenCopRate } from "@/lib/exchange-rates";

const ONE_HOUR = 3600;

/** GET /api/rates → today's PEN→COP rate (or the latest stored one). */
export async function GET() {
  // Never prerender at build time: this may write to the database.
  await connection();

  const rate = await getPenCopRate();
  if (!rate) {
    return Response.json(
      { error: "No hay una tasa de cambio disponible por ahora." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { base: "PEN", quote: "COP", ...rate },
    {
      headers: {
        "Cache-Control": `public, max-age=${ONE_HOUR}, s-maxage=${ONE_HOUR}`,
      },
    },
  );
}
