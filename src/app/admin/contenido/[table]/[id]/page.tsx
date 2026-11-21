import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AdminNotes, type AdminNoteView } from "@/components/admin/AdminNotes";
import { ContentForm } from "@/components/admin/ContentForm";
import { EquivalentsEditor, type EquivalentRowView } from "@/components/admin/EquivalentsEditor";
import type { RoutePreview } from "@/components/admin/LocationFields";
import { requireAdmin } from "@/lib/admin/auth";
import { CONTENT_CONFIG, EQUIVALENT_TABLES, formColumns, isContentTable } from "@/lib/admin/content-config";
import { countryName, originCountryOptions } from "@/lib/countries";
import { rawValuesFromRow } from "@/lib/admin/schemas";
import { createClient } from "@/lib/supabase/server";
import { STRAIGHT_LINE_WARNING, parseRoutePath } from "@/lib/transport";
import type { Json, RoutePathSource } from "@/types/database";

export const metadata: Metadata = { title: "Editar · Administración · Aterriza" };

const NEW = "nuevo";

async function Editor({
  params,
  searchParams,
}: {
  params: Promise<{ table: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { table, id } = await params;
  if (!isContentTable(table)) notFound();
  if (id !== NEW && !z.guid().safeParse(id).success) notFound();
  await requireAdmin();

  const config = CONTENT_CONFIG[table];
  let row: Record<string, unknown> | null = null;
  if (id !== NEW) {
    const supabase = await createClient();
    const columns = ["id", ...formColumns(config), "source_name", "source_url", "verified_at", "is_published"];
    if (config.map?.waypointsField) columns.push("path", "path_source");
    const { data, error } = await supabase
      .from(table as "customs")
      .select(columns.join(", "))
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return (
        <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
          No pudimos cargar el registro. Inténtalo de nuevo.
        </p>
      );
    }
    if (!data) notFound();
    row = data as unknown as Record<string, unknown>;
  }
  const query = await searchParams;
  const created = query.creado === "1";
  const routePreview: RoutePreview | null = config.map?.waypointsField
    ? {
        path: parseRoutePath((row?.path as Json | undefined) ?? null) ?? [],
        source: (row?.path_source as RoutePathSource | null | undefined) ?? null,
      }
    : null;
  const title = row ? String(row[config.titleField] ?? "") : "";

  // Equivalents per country (medicines, foods, slang), once the row exists.
  const contentType = table in EQUIVALENT_TABLES ? EQUIVALENT_TABLES[table as keyof typeof EQUIVALENT_TABLES] : null;
  let equivalents: EquivalentRowView[] = [];
  if (row && contentType) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("equivalents")
      .select("id, country_code, equivalent_text, brand_names, source_name, source_url, verified_at")
      .eq("content_type", contentType)
      .eq("content_id", id);
    equivalents = (data ?? [])
      .map((e) => ({
        id: e.id,
        countryCode: e.country_code,
        countryName: countryName(e.country_code),
        text: e.equivalent_text,
        brandNames: e.brand_names ?? [],
        sourceName: e.source_name,
        sourceUrl: e.source_url,
        verifiedAt: e.verified_at,
      }))
      .sort((a, b) => a.countryName.localeCompare(b.countryName, "es"));
  }

  // Internal notes of the row and of its equivalents (admin only, RLS).
  let notes: AdminNoteView[] = [];
  if (row && (table === "medicines" || table === "arrival_routes")) {
    const supabase = await createClient();
    const equivalentIds = equivalents.map((e) => e.id);
    const filter = equivalentIds.length
      ? `and(target_table.eq.${table},target_id.eq.${id}),and(target_table.eq.equivalents,target_id.in.(${equivalentIds.join(",")}))`
      : `and(target_table.eq.${table},target_id.eq.${id})`;
    const { data } = await supabase.from("admin_notes").select("id, target_table, target_id, notes, reference_url").or(filter);
    notes = (data ?? [])
      .map((n) => ({
        id: n.id,
        label:
          n.target_table === "equivalents"
            ? `Equivalencia en ${equivalents.find((e) => e.id === n.target_id)?.countryName ?? "otro país"}`
            : "Este registro",
        notes: n.notes,
        referenceUrl: n.reference_url,
      }))
      .sort((a, b) => (a.label === "Este registro" ? -1 : b.label === "Este registro" ? 1 : a.label.localeCompare(b.label, "es")));
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link
          href={`/admin/contenido/${table}`}
          className="self-start rounded font-bold text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          ← {config.label}
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">
          {row ? `Editar ${config.singular}` : `Nuevo ${config.singular}`}
        </h1>
        {title && <p className="text-muted">{title}</p>}
      </div>
      <ContentForm
        key={id}
        table={table}
        id={row ? id : null}
        initialValues={rawValuesFromRow(config, row)}
        verifiedAt={(row?.verified_at as string | null) ?? null}
        created={created}
        createdWarning={created && query.recorrido === "recta" ? STRAIGHT_LINE_WARNING : null}
        routePreview={routePreview}
      />
      <AdminNotes notes={notes} />
      {row && contentType && (
        <EquivalentsEditor
          contentType={contentType}
          contentId={id}
          rows={equivalents}
          countries={originCountryOptions()}
        />
      )}
      {!row && contentType && (
        <p className="text-sm text-muted">Guarda primero para añadir equivalencias por país.</p>
      )}
    </>
  );
}

function EditorSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando formulario…</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} aria-hidden="true" className="h-16 animate-pulse rounded-xl bg-accent-soft" />
      ))}
    </div>
  );
}

export default function EditContentPage(props: PageProps<"/admin/contenido/[table]/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
