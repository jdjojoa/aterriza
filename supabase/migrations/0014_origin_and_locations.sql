-- =============================================================================
-- Aterriza · 0014_origin_and_locations.sql
-- Students arriving from another city of Peru, not only from abroad.
-- Paste into the Supabase SQL Editor AFTER 0001–0013.
--
-- 100 % compatible with the current production code (main):
--   * only ADDS columns (with defaults), a table and functions;
--   * existing profiles become origin_type = 'internacional' and keep their
--     origin_country; nothing is renamed, changed or dropped.
--
-- 1. profiles: origin_type, origin_department, origin_city.
-- 2. peru_locations: departments (24 + Callao) and their main cities, plus
--    the provinces and districts of the Piura region. Official names (INEI).
-- 3. admin_origin_stats(): users by origin type and by city / country.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. profiles
-- 'internacional': origin_country is the country of origin.
-- 'nacional': origin_country = 'PE' and origin_department / origin_city say
-- where in Peru the student comes from.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists origin_type text not null default 'internacional',
  add column if not exists origin_department text,
  add column if not exists origin_city text;

alter table public.profiles drop constraint if exists profiles_origin_type_check;
alter table public.profiles
  add constraint profiles_origin_type_check
  check (origin_type in ('internacional', 'nacional'));

-- A national origin needs its department and city.
alter table public.profiles drop constraint if exists profiles_national_origin_check;
alter table public.profiles
  add constraint profiles_national_origin_check check (
    origin_type <> 'nacional'
    or (
      nullif(btrim(origin_department), '') is not null
      and nullif(btrim(origin_city), '') is not null
    )
  );

alter table public.profiles drop constraint if exists profiles_origin_text_length;
alter table public.profiles
  add constraint profiles_origin_text_length check (
    char_length(coalesce(origin_department, '')) <= 80
    and char_length(coalesce(origin_city, '')) <= 80
  );

create index if not exists profiles_origin_idx
  on public.profiles (origin_type, origin_country, origin_city);

-- -----------------------------------------------------------------------------
-- 2. peru_locations (reference data, read-only for the app)
-- kind: 'capital' (department capital), 'provincia' (provincial capital or
-- main city), 'distrito' (district, only for the Piura region).
-- -----------------------------------------------------------------------------
create table if not exists public.peru_locations (
  id         uuid primary key default gen_random_uuid(),
  department text not null check (char_length(department) between 1 and 80),
  city       text not null check (char_length(city) between 1 and 80),
  kind       text not null default 'provincia' check (kind in ('capital', 'provincia', 'distrito')),
  created_at timestamptz not null default now(),
  unique (department, city)
);

create index if not exists peru_locations_department_idx on public.peru_locations (department);

alter table public.peru_locations enable row level security;

drop policy if exists peru_locations_select_public on public.peru_locations;
create policy peru_locations_select_public on public.peru_locations
  for select to anon, authenticated
  using (true);

drop policy if exists peru_locations_write_admin on public.peru_locations;
create policy peru_locations_write_admin on public.peru_locations
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.peru_locations (department, city, kind) values
  -- Amazonas
  ('Amazonas', 'Chachapoyas', 'capital'),
  ('Amazonas', 'Bagua', 'provincia'),
  ('Amazonas', 'Bagua Grande', 'provincia'),
  -- Áncash
  ('Áncash', 'Huaraz', 'capital'),
  ('Áncash', 'Chimbote', 'provincia'),
  ('Áncash', 'Casma', 'provincia'),
  ('Áncash', 'Caraz', 'provincia'),
  ('Áncash', 'Huarmey', 'provincia'),
  -- Apurímac
  ('Apurímac', 'Abancay', 'capital'),
  ('Apurímac', 'Andahuaylas', 'provincia'),
  -- Arequipa
  ('Arequipa', 'Arequipa', 'capital'),
  ('Arequipa', 'Camaná', 'provincia'),
  ('Arequipa', 'Mollendo', 'provincia'),
  ('Arequipa', 'Chivay', 'provincia'),
  -- Ayacucho
  ('Ayacucho', 'Ayacucho', 'capital'),
  ('Ayacucho', 'Huanta', 'provincia'),
  ('Ayacucho', 'Puquio', 'provincia'),
  -- Cajamarca
  ('Cajamarca', 'Cajamarca', 'capital'),
  ('Cajamarca', 'Jaén', 'provincia'),
  ('Cajamarca', 'Chota', 'provincia'),
  ('Cajamarca', 'Cutervo', 'provincia'),
  ('Cajamarca', 'San Ignacio', 'provincia'),
  -- Callao
  ('Callao', 'Callao', 'capital'),
  -- Cusco
  ('Cusco', 'Cusco', 'capital'),
  ('Cusco', 'Sicuani', 'provincia'),
  ('Cusco', 'Quillabamba', 'provincia'),
  ('Cusco', 'Urubamba', 'provincia'),
  -- Huancavelica
  ('Huancavelica', 'Huancavelica', 'capital'),
  -- Huánuco
  ('Huánuco', 'Huánuco', 'capital'),
  ('Huánuco', 'Tingo María', 'provincia'),
  -- Ica
  ('Ica', 'Ica', 'capital'),
  ('Ica', 'Chincha Alta', 'provincia'),
  ('Ica', 'Pisco', 'provincia'),
  ('Ica', 'Nasca', 'provincia'),
  -- Junín
  ('Junín', 'Huancayo', 'capital'),
  ('Junín', 'Tarma', 'provincia'),
  ('Junín', 'La Oroya', 'provincia'),
  ('Junín', 'Jauja', 'provincia'),
  ('Junín', 'Satipo', 'provincia'),
  ('Junín', 'La Merced', 'provincia'),
  -- La Libertad
  ('La Libertad', 'Trujillo', 'capital'),
  ('La Libertad', 'Chepén', 'provincia'),
  ('La Libertad', 'Pacasmayo', 'provincia'),
  ('La Libertad', 'Huamachuco', 'provincia'),
  ('La Libertad', 'Otuzco', 'provincia'),
  -- Lambayeque
  ('Lambayeque', 'Chiclayo', 'capital'),
  ('Lambayeque', 'Lambayeque', 'provincia'),
  ('Lambayeque', 'Ferreñafe', 'provincia'),
  -- Lima
  ('Lima', 'Lima', 'capital'),
  ('Lima', 'Huacho', 'provincia'),
  ('Lima', 'Barranca', 'provincia'),
  ('Lima', 'Huaral', 'provincia'),
  ('Lima', 'San Vicente de Cañete', 'provincia'),
  ('Lima', 'Matucana', 'provincia'),
  -- Loreto
  ('Loreto', 'Iquitos', 'capital'),
  ('Loreto', 'Yurimaguas', 'provincia'),
  ('Loreto', 'Nauta', 'provincia'),
  -- Madre de Dios
  ('Madre de Dios', 'Puerto Maldonado', 'capital'),
  -- Moquegua
  ('Moquegua', 'Moquegua', 'capital'),
  ('Moquegua', 'Ilo', 'provincia'),
  -- Pasco
  ('Pasco', 'Cerro de Pasco', 'capital'),
  ('Pasco', 'Oxapampa', 'provincia'),
  -- Piura: department capital and provinces
  ('Piura', 'Piura', 'capital'),
  ('Piura', 'Sullana', 'provincia'),
  ('Piura', 'Talara', 'provincia'),
  ('Piura', 'Paita', 'provincia'),
  ('Piura', 'Sechura', 'provincia'),
  ('Piura', 'Chulucanas', 'provincia'),
  ('Piura', 'Ayabaca', 'provincia'),
  ('Piura', 'Huancabamba', 'provincia'),
  -- Piura: districts
  ('Piura', 'Castilla', 'distrito'),
  ('Piura', 'Veintiséis de Octubre', 'distrito'),
  ('Piura', 'Catacaos', 'distrito'),
  ('Piura', 'Tambogrande', 'distrito'),
  ('Piura', 'La Arena', 'distrito'),
  ('Piura', 'La Unión', 'distrito'),
  ('Piura', 'Las Lomas', 'distrito'),
  ('Piura', 'Colán', 'distrito'),
  ('Piura', 'La Huaca', 'distrito'),
  ('Piura', 'Amotape', 'distrito'),
  ('Piura', 'Vichayal', 'distrito'),
  ('Piura', 'Bellavista', 'distrito'),
  ('Piura', 'Marcavelica', 'distrito'),
  ('Piura', 'Querecotillo', 'distrito'),
  ('Piura', 'Ignacio Escudero', 'distrito'),
  ('Piura', 'Lancones', 'distrito'),
  ('Piura', 'Máncora', 'distrito'),
  ('Piura', 'Los Órganos', 'distrito'),
  ('Piura', 'El Alto', 'distrito'),
  ('Piura', 'Lobitos', 'distrito'),
  ('Piura', 'La Brea', 'distrito'),
  ('Piura', 'Vice', 'distrito'),
  ('Piura', 'Bernal', 'distrito'),
  ('Piura', 'Cristo Nos Valga', 'distrito'),
  ('Piura', 'Morropón', 'distrito'),
  ('Piura', 'Canchaque', 'distrito'),
  ('Piura', 'Montero', 'distrito'),
  -- Puno
  ('Puno', 'Puno', 'capital'),
  ('Puno', 'Juliaca', 'provincia'),
  ('Puno', 'Ilave', 'provincia'),
  -- San Martín
  ('San Martín', 'Moyobamba', 'capital'),
  ('San Martín', 'Tarapoto', 'provincia'),
  ('San Martín', 'Juanjuí', 'provincia'),
  ('San Martín', 'Rioja', 'provincia'),
  -- Tacna
  ('Tacna', 'Tacna', 'capital'),
  -- Tumbes
  ('Tumbes', 'Tumbes', 'capital'),
  ('Tumbes', 'Zarumilla', 'provincia'),
  ('Tumbes', 'Zorritos', 'provincia'),
  -- Ucayali
  ('Ucayali', 'Pucallpa', 'capital')
on conflict (department, city) do nothing;

-- -----------------------------------------------------------------------------
-- 3. admin_origin_stats(): users per origin type and per city (nacional) or
-- country (internacional). Only onboarded users. Admin only.
-- -----------------------------------------------------------------------------
create or replace function public.admin_origin_stats()
returns table (
  origin_type text,
  origin      text,
  users       bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede ver estas cifras.' using errcode = '42501';
  end if;

  return query
    select
      p.origin_type,
      case when p.origin_type = 'nacional' then coalesce(p.origin_city, 'Sin ciudad')
           else coalesce(p.origin_country, '??') end as origin,
      count(*)::bigint as users
    from public.profiles p
    where p.onboarded
    group by 1, 2
    order by users desc, origin;
end;
$$;

revoke execute on function public.admin_origin_stats() from public, anon;
grant  execute on function public.admin_origin_stats() to authenticated, service_role;

commit;
