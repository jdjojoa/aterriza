import { connection } from "next/server";
import { BASE_CURRENCY } from "@/lib/currency";
import { getExchangeRates } from "@/lib/exchange-rates";

const ONE_HOUR = 3600;

/** GET /api/rates → today's PEN-based rates (or the latest stored ones). */
export async function GET() {
  // Never prerender at build time: this may write to the database.
  await connection();

  const rates = await getExchangeRates();
  if (!rates) {
    return Response.json(
      { error: "No hay tasas de cambio disponibles por ahora." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { base: BASE_CURRENCY, ...rates },
    {
      headers: {
        "Cache-Control": `public, max-age=${ONE_HOUR}, s-maxage=${ONE_HOUR}`,
      },
    },
  );
}
