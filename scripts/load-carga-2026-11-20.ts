/**
 * Loads supabase/seed/data/carga-2026-11-20/ into the database:
 *   medicamentos.csv           → medicines (+ admin_notes)
 *   equivalencias_colombia.csv → equivalents, country CO (+ admin_notes)
 *   rutas_llegada.csv          → arrival_routes (the 3 "EJEMPLO" rows are deleted first)
 *
 * Everything is published (is_published = true) and NOT verified
 * (verified_at = null): the app shows "Referencial" until an admin verifies
 * each row in /admin.
 *
 * Requires migrations 0018, 0019 and 0020. Safe to run more than once: rows
 * are matched (medicine by name, equivalent by medicine + country, route by
 * city + mode) and updated instead of duplicated.
 *
 *   npx tsx scripts/load-carga-2026-11-20.ts --dry-run   # validate only
 *   npx tsx scripts/load-carga-2026-11-20.ts             # write
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { MEDICINE_DEFAULT_WARNING } from "../src/lib/admin/content-config";
import { DIGEMID_URL } from "../src/lib/identify";
import { safeConcentration, safeMedicineFact } from "../src/lib/medicine-safety";
import { loadEnv, parseCsv } from "./lib/csv";

const DIR = resolve(process.cwd(), "supabase/seed/data/carga-2026-11-20");
const DRY_RUN = process.argv.includes("--dry-run");
const FORBIDDEN = /sustitut|intercambiab/i;

type Row = Record<string, string>;

function readCsv(name: string): Row[] {
  const { rows } = parseCsv(readFileSync(resolve(DIR, name), "utf8"));
  const [header, ...body] = rows;
  return body.map((cells, i) => {
    if (cells.length !== header.length)
      throw new Error(`${name} línea ${i + 2}: ${cells.length} columnas, se esperaban ${header.length}`);
    return Object.fromEntries(header.map((h, c) => [h.trim(), cells[c].trim()]));
  });
}

const orNull = (value: string) => (value === "" ? null : value);
const list = (value: string) =>
  value
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const strengths = (value: string) => (value.match(/\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|%)/gi) ?? []).map((s) => fold(s).replace(/\s/g, ""));

function isHttp(url: string | null) {
  return url === null || /^https?:\/\//i.test(url);
}

/** Medicine text must pass the same rules as the app (no doses, no forbidden words). */
function checkText(where: string, field: string, value: string | null, concentration: string) {
  if (value === null) return;
  if (FORBIDDEN.test(value)) throw new Error(`${where}: «${field}» usa una palabra prohibida`);
  if (!safeMedicineFact(value, concentration))
    throw new Error(`${where}: «${field}» parece tener una dosis o frecuencia: ${value}`);
}

// ---------------------------------------------------------------------------
// Parse and validate
// ---------------------------------------------------------------------------
type MedicineInput = {
  key: string;
  record: Database["public"]["Tables"]["medicines"]["Insert"];
  note: { notes: string | null; reference_url: string | null };
};

function readMedicines(): MedicineInput[] {
  return readCsv("medicamentos.csv").map((r, i) => {
    const where = `medicamentos.csv línea ${i + 2}`;
    const name = r.principio_activo;
    // "Antigripal (paracetamol + fenilefrina + clorfenamina)" → the ingredients are inside.
    const inner = name.match(/\(([^)]+)\)\s*$/);
    const activeIngredient = (inner ? inner[1] : name).toLowerCase();
    const concentration = r.concentracion;
    if (!safeConcentration(concentration)) throw new Error(`${where}: concentración no válida «${concentration}»`);

    const brands = list(r.marcas_pe);
    const keywords = [...new Set(brands.map((b) => b.replace(/\s*\([^)]*\)\s*/g, " ").trim()).filter(Boolean))];
    const warning = `${r.advertencia} ${MEDICINE_DEFAULT_WARNING}`.trim();
    const sourceUrl = r.fuente_url;
    if (!r.fuente_nombre || !sourceUrl || !isHttp(sourceUrl)) throw new Error(`${where}: falta la fuente o no es un enlace`);
    const brandsUrl = orNull(r.fuente_marcas_url);
    if (!isHttp(brandsUrl)) throw new Error(`${where}: fuente_marcas_url no es un enlace`);

    const record = {
      brand_name_pe: name,
      active_ingredient: activeIngredient,
      presentation: orNull(r.forma),
      concentration,
      brand_names_pe: brands,
      sale_condition: orNull(r.condicion_venta_pe),
      general_use: orNull(r.uso_general),
      where_to_buy: orNull(r.donde_comprar),
      warning,
      digemid_url: /(^|\.)digemid\.minsa\.gob\.pe$/i.test(new URL(sourceUrl).hostname) ? sourceUrl : DIGEMID_URL,
      keywords,
      source_name: r.fuente_nombre,
      source_url: sourceUrl,
      verified_at: null,
      verified_by: null,
      is_published: true,
    };
    for (const field of ["brand_name_pe", "presentation", "sale_condition", "general_use", "where_to_buy", "warning"] as const)
      checkText(where, field, record[field], concentration);
    for (const brand of brands) checkText(where, "marcas_pe", brand, concentration);

    const notes = orNull(r.notas_para_revisar);
    return {
      key: fold(name),
      record,
      note: {
        notes: brandsUrl ? [notes, "Enlace: fuente de las marcas en Perú."].filter(Boolean).join("\n") : notes,
        reference_url: brandsUrl,
      },
    };
  });
}

type EquivalentInput = {
  line: number;
  medicineKey: string;
  country: string;
  text: string;
  brands: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  note: string | null;
};

function readEquivalents(medicines: MedicineInput[]): EquivalentInput[] {
  return readCsv("equivalencias_colombia.csv").map((r, i) => {
    const where = `equivalencias_colombia.csv línea ${i + 2}`;
    if (r.content_type !== "medicine") throw new Error(`${where}: content_type debe ser medicine`);
    if (r.country_code !== "CO") throw new Error(`${where}: country_code debe ser CO`);
    // Same active ingredient, and the CO strength is one of the PE strengths.
    const wanted = strengths(r.concentracion);
    const match = medicines.find(
      (m) => m.key === fold(r.principio_activo) && wanted.every((s) => strengths(m.record.concentration ?? "").includes(s)),
    );
    if (!match) throw new Error(`${where}: no hay medicamento «${r.principio_activo} ${r.concentracion}» en medicamentos.csv`);
    const concentration = match.record.concentration ?? "";
    const brands = list(r.brand_names);
    checkText(where, "equivalent_text", r.equivalent_text, concentration);
    for (const brand of brands) checkText(where, "brand_names", brand, concentration);
    if (!isHttp(orNull(r.source_url))) throw new Error(`${where}: source_url no es un enlace`);

    const note = [
      r.registro_invima_ejemplo && `Registro INVIMA de ejemplo: ${r.registro_invima_ejemplo}`,
      r.notas_para_revisar,
    ]
      .filter(Boolean)
      .join("\n");
    return {
      line: i + 2,
      medicineKey: match.key,
      country: r.country_code,
      text: r.equivalent_text,
      brands,
      sourceName: orNull(r.source_name),
      sourceUrl: orNull(r.source_url),
      note: orNull(note),
    };
  });
}

type RouteInput = Database["public"]["Tables"]["arrival_routes"]["Insert"] & { origin_city: string };

function readRoutes(): RouteInput[] {
  const price = (value: string, where: string) => {
    if (value === "") return null;
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) throw new Error(`${where}: precio no válido «${value}»`);
    return n;
  };
  return readCsv("rutas_llegada.csv").map((r, i) => {
    const where = `rutas_llegada.csv línea ${i + 2}`;
    if (!["bus", "avion", "colectivo"].includes(r.transport_mode)) throw new Error(`${where}: transport_mode no válido`);
    if (!isHttp(orNull(r.source_url))) throw new Error(`${where}: source_url no es un enlace`);
    return {
      origin_city: r.origin_city,
      origin_department: orNull(r.origin_department),
      transport_mode: r.transport_mode as "bus" | "avion" | "colectivo",
      terminal_origen: orNull(r.terminal_origen),
      terminal_llegada: orNull(r.terminal_llegada),
      duracion_aprox: orNull(r.duracion_aprox),
      precio_min: price(r.precio_min_pen, where),
      precio_max: price(r.precio_max_pen, where),
      empresas: orNull(r.empresas),
      notas: orNull(r.notas),
      source_name: orNull(r.source_name),
      source_url: orNull(r.source_url),
      verified_at: null,
      verified_by: null,
      is_published: true,
    };
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------
type Client = ReturnType<typeof createClient<Database>>;

async function upsertNote(supabase: Client, target_table: "medicines" | "equivalents", target_id: string, notes: string | null, reference_url: string | null) {
  if (!notes && !reference_url) return;
  const { error } = await supabase
    .from("admin_notes")
    .upsert({ target_table, target_id, notes, reference_url }, { onConflict: "target_table,target_id" });
  if (error) throw new Error(`admin_notes: ${error.message}`);
}

async function main() {
  const medicines = readMedicines();
  const equivalents = readEquivalents(medicines);
  const routes = readRoutes();
  // A photo of a foreign package with only the brand readable ("Dolex") still
  // finds the Peruvian row: the other countries' brands are search keywords too.
  for (const e of equivalents) {
    const med = medicines.find((m) => m.key === e.medicineKey)!;
    const extra = e.brands.map((b) => b.replace(/\s*\([^)]*\)\s*/g, " ").trim()).filter(Boolean);
    med.record.keywords = [...new Set([...(med.record.keywords ?? []), ...extra])];
  }
  console.log(`OK medicamentos.csv: ${medicines.length} filas válidas`);
  console.log(`OK equivalencias_colombia.csv: ${equivalents.length} filas válidas`);
  console.log(`OK rutas_llegada.csv: ${routes.length} filas válidas`);
  if (DRY_RUN) {
    for (const m of medicines)
      console.log(`  · ${m.record.brand_name_pe} [${m.record.active_ingredient}] ${m.record.concentration} — marcas: ${m.record.brand_names_pe?.join(", ") || "—"} — claves: ${m.record.keywords?.join(", ")}`);
    for (const e of equivalents) console.log(`  · CO ${e.medicineKey} → ${e.brands.join(", ")}`);
    console.log("--dry-run: no se escribió nada.");
    return;
  }

  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Medicines, matched by name (case and accents ignored).
  const { data: existingMeds, error: medErr } = await supabase.from("medicines").select("id, brand_name_pe");
  if (medErr) throw new Error(`medicines: ${medErr.message}`);
  const medicineIds = new Map<string, string>();
  let medInserted = 0;
  let medUpdated = 0;
  for (const m of medicines) {
    const found = (existingMeds ?? []).filter((e) => fold(e.brand_name_pe) === m.key);
    if (found.length > 1) throw new Error(`medicines: «${m.record.brand_name_pe}» coincide con ${found.length} filas`);
    let id = found[0]?.id;
    if (id) {
      const { error } = await supabase.from("medicines").update(m.record).eq("id", id);
      if (error) throw new Error(`medicines ${m.record.brand_name_pe}: ${error.message}`);
      medUpdated++;
    } else {
      const { data, error } = await supabase.from("medicines").insert(m.record).select("id").single();
      if (error) throw new Error(`medicines ${m.record.brand_name_pe}: ${error.message}`);
      id = data.id;
      medInserted++;
    }
    medicineIds.set(m.key, id);
    await upsertNote(supabase, "medicines", id, m.note.notes, m.note.reference_url);
  }
  console.log(`medicines: ${medInserted} insertadas, ${medUpdated} actualizadas`);

  // Equivalents (unique per medicine + country).
  for (const e of equivalents) {
    const contentId = medicineIds.get(e.medicineKey)!;
    const { data, error } = await supabase
      .from("equivalents")
      .upsert(
        {
          content_type: "medicine",
          content_id: contentId,
          country_code: e.country,
          equivalent_text: e.text,
          brand_names: e.brands,
          source_name: e.sourceName,
          source_url: e.sourceUrl,
          verified_at: null,
        },
        { onConflict: "content_type,content_id,country_code" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`equivalencias_colombia.csv línea ${e.line}: ${error.message}`);
    await upsertNote(supabase, "equivalents", data.id, e.note, null);
  }
  console.log(`equivalents: ${equivalents.length} guardadas (CO)`);

  // Arrival routes: delete the placeholder rows, then match by city + mode.
  const { data: removed, error: delErr } = await supabase
    .from("arrival_routes")
    .delete()
    .like("notas", "EJEMPLO%")
    .is("source_name", null)
    .select("id");
  if (delErr) throw new Error(`arrival_routes (borrar ejemplos): ${delErr.message}`);
  console.log(`arrival_routes: ${removed?.length ?? 0} filas de EJEMPLO borradas`);

  const { data: existingRoutes, error: routeErr } = await supabase.from("arrival_routes").select("id, origin_city, transport_mode");
  if (routeErr) throw new Error(`arrival_routes: ${routeErr.message}`);
  let routeInserted = 0;
  let routeUpdated = 0;
  for (const r of routes) {
    const found = (existingRoutes ?? []).filter(
      (e) => fold(e.origin_city) === fold(r.origin_city) && e.transport_mode === r.transport_mode,
    );
    if (found.length > 1) throw new Error(`arrival_routes: ${r.origin_city} (${r.transport_mode}) coincide con ${found.length} filas`);
    const { error } = found[0]
      ? await supabase.from("arrival_routes").update(r).eq("id", found[0].id)
      : await supabase.from("arrival_routes").insert(r);
    if (error) throw new Error(`arrival_routes ${r.origin_city} (${r.transport_mode}): ${error.message}`);
    if (found[0]) routeUpdated++;
    else routeInserted++;
  }
  console.log(`arrival_routes: ${routeInserted} insertadas, ${routeUpdated} actualizadas`);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
