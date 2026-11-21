-- =============================================================================
-- Aterriza · 0015_arrival_routes.sql
-- "Cómo llegar a Piura": intercity routes for students coming from another
-- city of Peru.
-- Paste into the Supabase SQL Editor AFTER 0014.
--
-- 100 % compatible with the current production code (main): only creates a
-- new table, its trigger and its policies. main never reads it.
--
-- Fares are transport fares, so the safety rule applies: the admin form
-- requires a source to verify, and the app shows <SourceBadge>
-- ("Verificado" / "Referencial"). The source columns are nullable here only so
-- the three EXAMPLE rows below can exist without an invented source.
-- =============================================================================

begin;

create table if not exists public.arrival_routes (
  id                uuid primary key default gen_random_uuid(),
  origin_city       text not null check (char_length(origin_city) between 1 and 80),
  transport_mode    text not null check (transport_mode in ('bus', 'avion', 'colectivo')),
  terminal_origen   text check (char_length(terminal_origen) <= 200),
  terminal_llegada  text check (char_length(terminal_llegada) <= 200),
  duracion_aprox    text check (char_length(duracion_aprox) <= 100),
  precio_min        numeric(8, 2) check (precio_min >= 0),
  precio_max        numeric(8, 2) check (precio_max >= 0),
  empresas          text check (char_length(empresas) <= 500),
  notas             text check (char_length(notas) <= 1000),
  source_name       text,
  source_url        text check (source_url ~* '^https?://'),
  verified_at       date null,
  verified_by       uuid references public.profiles (id) on delete set null,
  is_published      boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint arrival_routes_price_range check (
    precio_min is null or precio_max is null or precio_min <= precio_max
  ),
  -- Verified rows always carry a source.
  constraint arrival_routes_verified_has_source check (
    verified_at is null
    or (nullif(btrim(source_name), '') is not null and source_url is not null)
  )
);

create index if not exists arrival_routes_origin_city_idx
  on public.arrival_routes (lower(origin_city));

drop trigger if exists set_updated_at on public.arrival_routes;
create trigger set_updated_at before update on public.arrival_routes
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: same rules as the other content tables.
-- -----------------------------------------------------------------------------
alter table public.arrival_routes enable row level security;

drop policy if exists arrival_routes_select_published on public.arrival_routes;
create policy arrival_routes_select_published on public.arrival_routes
  for select to anon, authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists arrival_routes_insert_admin on public.arrival_routes;
create policy arrival_routes_insert_admin on public.arrival_routes
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists arrival_routes_update_admin on public.arrival_routes;
create policy arrival_routes_update_admin on public.arrival_routes
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists arrival_routes_delete_admin on public.arrival_routes;
create policy arrival_routes_delete_admin on public.arrival_routes
  for delete to authenticated
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Three EXAMPLE rows, pending verification (verified_at null). No terminals,
-- durations, prices, companies or sources: complete them from /admin before
-- verifying them, or unpublish / delete them.
-- -----------------------------------------------------------------------------
insert into public.arrival_routes (origin_city, transport_mode, notas)
select v.origin_city, v.transport_mode, v.notas
from (values
  ('Lima', 'bus',
   'EJEMPLO pendiente de verificación: faltan terminales, duración, precios, empresas y fuente.'),
  ('Lima', 'avion',
   'EJEMPLO pendiente de verificación: faltan aeropuertos, duración, precios, aerolíneas y fuente.'),
  ('Talara', 'colectivo',
   'EJEMPLO pendiente de verificación: faltan paraderos, duración, precios, empresas y fuente.')
) as v (origin_city, transport_mode, notas)
where not exists (select 1 from public.arrival_routes);

commit;
