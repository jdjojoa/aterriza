/**
 * Loads content from supabase/seed/data/*.csv into Supabase.
 *
 *   npx tsx scripts/seed-from-csv.ts            # validate + write
 *   npx tsx scripts/seed-from-csv.ts --dry-run  # validate only, no writes
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local (bypasses RLS). Run it only on
 * your machine; never import this file from app code.
 *
 * Matching ("upsert"): a row with `id` updates that row. Otherwise places and
 * foods match by `name`, transport_routes by `code` (or `name` when code is empty),
 * slang_terms by `term` and customs by `title`. Matching rows are updated, the rest
 * are inserted. Nothing is ever deleted.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

type TableName = "places" | "transport_routes" | "foods" | "slang_terms" | "customs";
type Value = string | number | boolean | null | string[] | [number, number][];
type Kind = "text" | "number" | "boolean" | "date" | "uuid" | "path" | "url" | "list";
type Column = { kind: Kind; required?: boolean; oneOf?: readonly string[] };

const DATA_DIR = resolve(process.cwd(), "supabase/seed/data");
const DRY_RUN = process.argv.includes("--dry-run");

const common: Record<string, Column> = {
  source_name: { kind: "text", required: true },
  source_url: { kind: "url", required: true },
  verified_at: { kind: "date" },
  verified_by: { kind: "uuid" },
  is_published: { kind: "boolean" },
};

// Safety rule: only transport_routes (and medicines) require a source.
const commonOptionalSource: Record<string, Column> = {
  ...common,
  source_name: { kind: "text" },
  source_url: { kind: "url" },
};

const TABLES: { table: TableName; keys: string[]; columns: Record<string, Column> }[] = [
  {
    table: "places",
    keys: ["name"],
    columns: {
      id: { kind: "uuid" },
      name: { kind: "text", required: true },
      category: {
        kind: "text",
        required: true,
        oneOf: ["turistico", "comida", "salud", "tramites", "compras", "universidad"],
      },
      description: { kind: "text" },
      address: { kind: "text" },
      lat: { kind: "number" },
      lng: { kind: "number" },
      hours: { kind: "text" },
      price_info: { kind: "text" },
      image_url: { kind: "url" },
      ...commonOptionalSource,
    },
  },
  {
    table: "transport_routes",
    keys: ["code", "name"],
    columns: {
      id: { kind: "uuid" },
      code: { kind: "text" },
      name: { kind: "text", required: true },
      mode: {
        kind: "text",
        required: true,
        oneOf: ["combi", "mototaxi", "bus", "colectivo", "taxi"],
      },
      origin_name: { kind: "text" },
      origin_lat: { kind: "number" },
      origin_lng: { kind: "number" },
      destination_name: { kind: "text" },
      destination_lat: { kind: "number" },
      destination_lng: { kind: "number" },
      path: { kind: "path" },
      fare_min: { kind: "number" },
      fare_max: { kind: "number" },
      schedule: { kind: "text" },
      tips: { kind: "text" },
      ...common,
    },
  },
  {
    table: "foods",
    keys: ["name"],
    columns: {
      id: { kind: "uuid" },
      name: { kind: "text", required: true },
      description: { kind: "text" },
      main_ingredients: { kind: "text" },
      similar_co: { kind: "text" },
      where_to_try: { kind: "text" },
      image_url: { kind: "url" },
      keywords: { kind: "list" },
      ...commonOptionalSource,
    },
  },
  {
    table: "slang_terms",
    keys: ["term"],
    columns: {
      id: { kind: "uuid" },
      term: { kind: "text", required: true },
      meaning: { kind: "text", required: true },
      equivalent_co: { kind: "text" },
      example: { kind: "text" },
      category: {
        kind: "text",
        oneOf: ["personas", "expresiones", "comida", "transporte", "compras", "estudio", "ropa", "lugares"],
      },
      ...commonOptionalSource,
    },
  },
  {
    table: "customs",
    keys: ["title"],
    columns: {
      id: { kind: "uuid" },
      title: { kind: "text", required: true },
      body: { kind: "text", required: true },
      category: {
        kind: "text",
        oneOf: ["saludo", "comida", "transporte", "horarios", "propinas", "seguridad"],
      },
      icon: { kind: "text" },
      ...commonOptionalSource,
    },
  },
];

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
function loadEnv(file = ".env.local"): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

// ---------------------------------------------------------------------------
// CSV (RFC 4180: quoted fields, "" escapes, newlines inside quotes).
// Accepts "," or ";" (Excel in Spanish saves with ";").
// ---------------------------------------------------------------------------
function parseCsv(text: string): { rows: string[][]; delimiter: string } {
  text = text.replace(/^﻿/, "");
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const delimiter = !firstLine.includes(",") && firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("comillas sin cerrar al final del archivo");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return { rows: rows.filter((r) => r.some((f) => f.trim() !== "")), delimiter };
}

// ---------------------------------------------------------------------------
// Value conversion. Empty cell -> null (or "not set" for is_published).
// ---------------------------------------------------------------------------
function convert(raw: string, col: Column, delimiter: string): Value {
  const v = raw.trim();
  if (v === "") {
    if (col.required) throw new Error("es obligatorio");
    return col.kind === "list" ? [] : null; // text[] columns are NOT NULL
  }
  switch (col.kind) {
    case "text":
      if (col.oneOf && !col.oneOf.includes(v))
        throw new Error(`"${v}" no es válido; usa uno de: ${col.oneOf.join(", ")}`);
      return v;
    case "list": // "cebiche|seviche" -> ["cebiche", "seviche"]
      return [...new Set(v.split("|").map((x) => x.trim()).filter(Boolean))];
    case "url":
      if (!/^https?:\/\//i.test(v)) throw new Error(`"${v}" debe empezar por http:// o https://`);
      return v;
    case "number": {
      const n = Number(delimiter === ";" ? v.replace(",", ".") : v);
      if (!Number.isFinite(n)) throw new Error(`"${v}" no es un número`);
      return n;
    }
    case "boolean": {
      const b = v.toLowerCase();
      if (["true", "si", "sí", "1"].includes(b)) return true;
      if (["false", "no", "0"].includes(b)) return false;
      throw new Error(`"${v}" debe ser true o false`);
    }
    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))
        throw new Error(`"${v}" debe tener formato AAAA-MM-DD`);
      return v;
    case "uuid":
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
        throw new Error(`"${v}" no es un UUID`);
      return v.toLowerCase();
    case "path": {
      let parsed: unknown;
      try {
        parsed = JSON.parse(v);
      } catch {
        throw new Error("debe ser JSON, p. ej. [[-5.19,-80.62],[-5.17,-80.63]]");
      }
      const ok =
        Array.isArray(parsed) &&
        parsed.every(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            p.every((x) => typeof x === "number" && Number.isFinite(x)),
        );
      if (!ok) throw new Error("debe ser una lista de puntos [lat, lng]");
      return parsed as [number, number][];
    }
  }
}

function checkRanges(table: TableName, rec: Record<string, Value>): string[] {
  const errs: string[] = [];
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v !== "number") continue;
    if (/(^|_)lat$/.test(k) && (v < -90 || v > 90)) errs.push(`${k}: fuera de rango`);
    if (/(^|_)lng$/.test(k) && (v < -180 || v > 180)) errs.push(`${k}: fuera de rango`);
    if (k.startsWith("fare_") && v < 0) errs.push(`${k}: no puede ser negativo`);
  }
  if (
    table === "transport_routes" &&
    typeof rec.fare_min === "number" &&
    typeof rec.fare_max === "number" &&
    rec.fare_min > rec.fare_max
  )
    errs.push("fare_min no puede ser mayor que fare_max");
  return errs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
type Prepared = { line: number; record: Record<string, Value>; label: string };

function readTable(spec: (typeof TABLES)[number]): Prepared[] {
  const file = resolve(DATA_DIR, `${spec.table}.csv`);
  const { rows, delimiter } = parseCsv(readFileSync(file, "utf8"));
  const [header, ...body] = rows;
  const columns = Object.keys(spec.columns);
  const names = (header ?? []).map((h) => h.trim());
  const unknown = names.filter((h) => !columns.includes(h));
  const missing = columns.filter((c) => !names.includes(c));
  if (unknown.length || missing.length)
    throw new Error(
      `${spec.table}.csv: encabezado incorrecto.` +
        (unknown.length ? ` Sobran: ${unknown.join(", ")}.` : "") +
        (missing.length ? ` Faltan: ${missing.join(", ")}.` : ""),
    );

  const errors: string[] = [];
  const prepared: Prepared[] = [];
  const seen = new Map<string, number>();
  body.forEach((cells, i) => {
    const line = i + 2;
    if (cells.length !== names.length) {
      errors.push(`línea ${line}: tiene ${cells.length} columnas y el encabezado ${names.length}`);
      return;
    }
    const record: Record<string, Value> = {};
    const rowErrs: string[] = [];
    names.forEach((name, j) => {
      try {
        const value = convert(cells[j], spec.columns[name], delimiter);
        // Empty is_published: keep the current value (or the DB default on insert).
        if (!(name === "is_published" && value === null)) record[name] = value;
      } catch (e) {
        rowErrs.push(`${name}: ${(e as Error).message}`);
      }
    });
    rowErrs.push(...checkRanges(spec.table, record));
    if (rowErrs.length) {
      errors.push(...rowErrs.map((e) => `línea ${line}: ${e}`));
      return;
    }
    const key = matchKey(spec.keys, record);
    if (seen.has(key)) errors.push(`línea ${line}: repite ${key} de la línea ${seen.get(key)}`);
    seen.set(key, line);
    prepared.push({ line, record, label: String(record.code ?? record.name ?? record.term ?? record.title) });
  });
  if (errors.length)
    throw new Error(`${spec.table}.csv tiene errores:\n  ${errors.join("\n  ")}`);
  return prepared;
}

/** The identity used to match a CSV row against the database. */
function matchKey(keys: string[], rec: Record<string, Value>): string {
  if (rec.id) return `id=${rec.id}`;
  const k = keys.find((key) => rec[key] !== null && rec[key] !== undefined)!;
  return `${k}=${String(rec[k]).toLocaleLowerCase("es")}`;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  // Validate every file before touching the database.
  const work = TABLES.map((spec) => ({ spec, rows: readTable(spec) }));
  for (const { spec, rows } of work) console.log(`OK ${spec.table}.csv: ${rows.length} filas válidas`);
  if (DRY_RUN) {
    console.log("--dry-run: no se escribió nada.");
    return;
  }
  if (!url || !serviceKey)
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const { spec, rows } of work) {
    const select = ["id", ...spec.keys].join(", ");
    const { data: existing, error } = await supabase.from(spec.table).select(select);
    if (error) throw new Error(`${spec.table}: ${error.message}`);

    // key -> ids already in the database
    const index = new Map<string, string[]>();
    for (const row of (existing ?? []) as unknown as Record<string, Value>[]) {
      const ids = [`id=${row.id}`];
      for (const key of spec.keys)
        if (row[key]) ids.push(`${key}=${String(row[key]).toLocaleLowerCase("es")}`);
      for (const k of ids) index.set(k, [...(index.get(k) ?? []), String(row.id)]);
    }

    const inserts: Record<string, Value>[] = [];
    let updated = 0;
    for (const { line, record, label } of rows) {
      const key = matchKey(spec.keys, record);
      const ids = index.get(key) ?? [];
      if (ids.length > 1)
        throw new Error(`${spec.table} línea ${line}: ${key} coincide con ${ids.length} filas; usa la columna id`);
      if (ids.length === 0) {
        if (record.id) throw new Error(`${spec.table} línea ${line}: no existe ninguna fila con ${key}`);
        // No id: let Postgres generate it (gen_random_uuid()).
        const { id, ...rest } = record;
        inserts.push(id ? record : rest);
        continue;
      }
      const { id: _id, ...changes } = record;
      void _id;
      const { error: upErr } = await supabase
        .from(spec.table)
        .update(changes as never)
        .eq("id", ids[0]);
      if (upErr) throw new Error(`${spec.table} línea ${line} (${label}): ${upErr.message}`);
      updated++;
    }
    if (inserts.length) {
      const { error: insErr } = await supabase.from(spec.table).insert(inserts as never, { defaultToNull: false });
      if (insErr) throw new Error(`${spec.table} (insertar): ${insErr.message}`);
    }
    console.log(`${spec.table}: ${inserts.length} insertadas, ${updated} actualizadas`);
  }
}

main().catch((e: Error) => {
  console.error(`ERROR ${e.message}`);
  process.exit(1);
});
