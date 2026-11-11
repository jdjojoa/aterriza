/**
 * Recalculates transport_routes.path for every route with OSRM (one-off).
 *
 *   npm run routes:recalculate             # recalculate and write
 *   npm run routes:recalculate -- --dry-run  # ask OSRM, write nothing
 *
 * Needs migration 0012_route_waypoints.sql. Uses SUPABASE_SERVICE_ROLE_KEY from
 * .env.local (bypasses RLS): run it only on your machine. OSRM requests go
 * through the same throttle as the app (at most 1 per second). Routes without
 * origin or destination are skipped. If OSRM fails for a route, a straight
 * line is stored (path_source = 'straight') so the admin can retry later with
 * "Recalcular recorrido".
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { computeRouteGeometry, routeControlPoints } from "../src/lib/osrm";
import type { Database } from "../src/types/database";

const DRY_RUN = process.argv.includes("--dry-run");

function loadEnv(file = ".env.local") {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  const supabase = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

  const { data: routes, error } = await supabase
    .from("transport_routes")
    .select("id, code, name, origin_lat, origin_lng, destination_lat, destination_lng, waypoints")
    .order("name");
  if (error) throw new Error(`No pudimos leer las rutas: ${error.message}`);

  let osrm = 0;
  let straight = 0;
  let skipped = 0;
  console.log(`${routes.length} rutas${DRY_RUN ? " (dry run: no se escribe nada)" : ""}`);

  for (const route of routes) {
    const label = `${route.code ? `${route.code} · ` : ""}${route.name}`;
    const points = routeControlPoints(route);
    if (!points) {
      skipped++;
      console.log(`SKIP  ${label} (sin origen o destino)`);
      continue;
    }

    const geometry = await computeRouteGeometry(points);
    if (geometry.source === "osrm") osrm++;
    else straight++;
    console.log(
      geometry.source === "osrm"
        ? `OSRM  ${label} (${geometry.path.length} puntos)`
        : `RECTA ${label} (OSRM falló: ${geometry.error})`,
    );

    if (DRY_RUN) continue;
    const { error: updateError } = await supabase
      .from("transport_routes")
      .update({ path: geometry.path, path_source: geometry.source })
      .eq("id", route.id);
    if (updateError) throw new Error(`No pudimos guardar «${label}»: ${updateError.message}`);
  }

  console.log(`\nListo: ${osrm} por calles, ${straight} en línea recta, ${skipped} omitidas.`);
  if (straight > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
