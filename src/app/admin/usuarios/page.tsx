import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/auth";
import { countryName } from "@/lib/countries";
import { ROLE_LABELS } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Usuarios · Administración · Aterriza" };

type Search = { q?: string | string[] };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

const dateFormat = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
});

async function UserList({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireAdmin();
  const q = first((await searchParams).q).trim().slice(0, 80);

  // Emails come from auth.users inside the security definer function (admin only).
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", { p_search: q || null });
  const users = data ?? [];

  return (
    <>
      <Form action="/admin/usuarios" className="flex flex-col gap-1.5" role="search">
        <label htmlFor="user-search" className="text-sm font-bold text-heading">
          Buscar por nombre o correo
        </label>
        <div className="flex gap-2">
          <input
            id="user-search"
            name="q"
            type="search"
            defaultValue={q}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            placeholder="Ana o ana@correo.com"
          />
          <button type="submit" className={buttonClasses("secondary", "md")}>
            Buscar
          </button>
        </div>
      </Form>

      {error ? (
        <p role="alert" className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
          No pudimos cargar los usuarios. ¿Ejecutaste la migración 0010_admin_users.sql?
        </p>
      ) : users.length === 0 ? (
        <p className="rounded-2xl border border-border/30 bg-surface p-6 text-center text-muted">
          {q ? "Ningún usuario coincide con la búsqueda." : "Todavía no hay usuarios."}
        </p>
      ) : (
        <section aria-labelledby="user-count" className="flex flex-col gap-3">
          <h2 id="user-count" className="text-sm font-bold text-muted">
            {users.length} {users.length === 1 ? "usuario" : "usuarios"}
            {users.length >= 200 && " (se muestran los 200 más recientes; usa el buscador)"}
          </h2>
          <ul className="flex flex-col gap-3">
            {users.map((user) => {
              const name = user.full_name?.trim() || "Sin nombre";
              const isSelf = user.id === me.id;
              return (
                <li key={user.id}>
                  <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-heading">
                          {name}
                          {isSelf && <span className="text-muted"> (tú)</span>}
                        </p>
                        <Badge variant={user.role === "admin" ? "primary" : "neutral"}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </div>
                      <p className="break-all text-sm text-foreground">{user.email ?? "Sin correo"}</p>
                      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                        <div className="flex gap-1">
                          <dt>País de origen:</dt>
                          <dd className="text-foreground">{countryName(user.origin_country)}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt>Registro:</dt>
                          <dd className="text-foreground">
                            <time dateTime={user.created_at}>{dateFormat.format(new Date(user.created_at))}</time>
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div className="sm:w-48 sm:shrink-0">
                      <RoleSelect userId={user.id} userName={name} role={user.role} isSelf={isSelf} />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

export default function UsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">Usuarios</h1>
      <p className="text-muted">
        Cambia el rol entre usuario y administrador. No puedes cambiar tu propio rol y siempre debe quedar al
        menos un administrador.
      </p>
      <Suspense
        fallback={
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">Cargando usuarios…</span>
            <span aria-hidden="true" className="h-32 animate-pulse rounded-2xl bg-accent-soft" />
            <span aria-hidden="true" className="h-32 animate-pulse rounded-2xl bg-accent-soft" />
          </div>
        }
      >
        <UserList searchParams={searchParams as Promise<Search>} />
      </Suspense>
    </>
  );
}
