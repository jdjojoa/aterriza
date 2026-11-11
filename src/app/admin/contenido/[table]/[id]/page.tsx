import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ContentForm } from "@/components/admin/ContentForm";
import type { RoutePreview } from "@/components/admin/LocationFields";
import { requireAdmin } from "@/lib/admin/auth";
import { CONTENT_CONFIG, formColumns, isContentTable } from "@/lib/admin/content-config";
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
