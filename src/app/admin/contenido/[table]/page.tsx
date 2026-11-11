import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { markVerifiedToday } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { requireAdmin, todayInLima } from "@/lib/admin/auth";
import {
  CONTENT_CONFIG,
  isContentTable,
  requiresVerification,
  type ContentTable,
} from "@/lib/admin/content-config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Contenido · Administración · Aterriza" };

const PAGE_SIZE = 50;

type Search = { q?: string | string[]; sin_verificar?: string | string[]; pagina?: string | string[]; eliminado?: string | string[] };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Strips characters with meaning in PostgREST filters (commas, parens, wildcards). */
function sanitizeQuery(q: string) {
  return q.replace(/[,()*%_\\"'.:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function listHref(table: ContentTable, q: string, unverified: boolean, page = 1) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (unverified) params.set("sin_verificar", "1");
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return `/admin/contenido/${table}${query ? `?${query}` : ""}`;
}

async function ContentList({
  params,
  searchParams,
}: {
  params: Promise<{ table: string }>;
  searchParams: Promise<Search>;
}) {
  const { table } = await params;
  if (!isContentTable(table)) notFound();
  await requireAdmin();

  const config = CONTENT_CONFIG[table];
  // Verification only exists for medicines and transport (safety rule).
  const verifiable = requiresVerification(table);
  const search = await searchParams;
  const q = sanitizeQuery(first(search.q));
  const unverified = verifiable && first(search.sin_verificar) === "1";
  const page = Math.max(1, Number.parseInt(first(search.pagina), 10) || 1);
  const columns = ["id", config.titleField, config.subtitleField, "verified_at", "is_published", "updated_at"]
    .filter(Boolean)
    .join(", ");

  const supabase = await createClient();
  let query = supabase
    .from(table as "customs")
    .select(columns, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (unverified) query = query.is("verified_at", null);
  if (q) query = query.or(config.searchFields.map((f) => `${f}.ilike.%${q}%`).join(","));

  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as Record<string, string | boolean | null>[];
  const today = todayInLima();
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">{config.label}</h1>
        <Link href={`/admin/contenido/${table}/nuevo`} className={buttonClasses("primary", "md")}>
          Nuevo {config.singular}
        </Link>
      </div>

      {first(search.eliminado) === "1" && (
        <p role="status" className="rounded-xl bg-accent-soft p-3 font-bold text-on-accent-soft">
          Registro eliminado.
        </p>
      )}

      <Form action={`/admin/contenido/${table}`} className="flex flex-col gap-3" role="search">
        <label htmlFor="admin-search" className="text-sm font-bold text-heading">
          Buscar en {config.label.toLowerCase()}
        </label>
        <div className="flex gap-2">
          <input
            id="admin-search"
            name="q"
            type="search"
            defaultValue={q}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            placeholder="Escribe un nombre…"
          />
          {unverified && <input type="hidden" name="sin_verificar" value="1" />}
          <button type="submit" className={buttonClasses("secondary", "md")}>
            Buscar
          </button>
        </div>
        {verifiable && (
        <div className="flex flex-wrap gap-2" aria-label="Filtro">
          {[
            { label: "Todos", value: false },
            { label: "Sin verificar", value: true },
          ].map((f) => (
            <Link
              key={f.label}
              href={listHref(table, q, f.value)}
              aria-current={unverified === f.value ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                unverified === f.value
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border/40 bg-surface text-heading hover:bg-hover"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        )}
      </Form>

      {error ? (
        <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
          No pudimos cargar la lista. Inténtalo de nuevo.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border/30 bg-surface p-6 text-center text-muted">
          {q || unverified ? "No hay resultados con estos filtros." : "Todavía no hay registros."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/30 bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              {config.label}: {count ?? rows.length} resultados
            </caption>
            <thead className="border-b border-border/30 text-heading">
              <tr>
                <th scope="col" className="p-3 font-bold">Nombre</th>
                <th scope="col" className="p-3 font-bold">Estado</th>
                {verifiable && (
                  <th scope="col" className="p-3 font-bold">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = String(row.id);
                const verifiedAt = row.verified_at as string | null;
                const subtitle = config.subtitleField ? (row[config.subtitleField] as string | null) : null;
                return (
                  <tr key={id} className="border-b border-border/20 align-top last:border-0">
                    <td className="p-3">
                      <Link
                        href={`/admin/contenido/${table}/${id}`}
                        className="font-bold text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {String(row[config.titleField] ?? "(sin nombre)")}
                      </Link>
                      {subtitle && <p className="mt-0.5 line-clamp-2 text-muted">{subtitle}</p>}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-start gap-1">
                        {verifiable &&
                          (verifiedAt ? (
                            <Badge variant="success">Verificado {verifiedAt}</Badge>
                          ) : (
                            <Badge variant="warning">Referencial</Badge>
                          ))}
                        {row.is_published ? (
                          !verifiable && <Badge variant="success">Publicado</Badge>
                        ) : (
                          <Badge variant="warning">Borrador</Badge>
                        )}
                      </div>
                    </td>
                    {verifiable && (
                      <td className="w-40 p-3">
                        {verifiedAt === today ? (
                          <span className="text-muted">Verificado hoy</span>
                        ) : (
                          <ActionButton
                            action={markVerifiedToday.bind(null, table, id)}
                            label="Marcar verificado hoy"
                            pendingLabel="Marcando…"
                          />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-between gap-2">
          {page > 1 ? (
            <Link href={listHref(table, q, unverified, page - 1)} className={buttonClasses("secondary", "md")}>
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={listHref(table, q, unverified, page + 1)} className={buttonClasses("secondary", "md")}>
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Cargando…</span>
      <span aria-hidden="true" className="h-10 w-48 animate-pulse rounded-xl bg-accent-soft" />
      <span aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-accent-soft" />
      <span aria-hidden="true" className="h-80 animate-pulse rounded-2xl bg-accent-soft" />
    </div>
  );
}

export default function ContentListPage(props: PageProps<"/admin/contenido/[table]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ContentList params={props.params} searchParams={props.searchParams as Promise<Search>} />
    </Suspense>
  );
}
