/** Helpers shared by the CSV loaders in scripts/. */
import { existsSync, readFileSync } from "node:fs";

export function loadEnv(file = ".env.local"): Record<string, string> {
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
export function parseCsv(text: string): { rows: string[][]; delimiter: string } {
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
