-- =============================================================================
-- Aterriza · 0001_schema.sql
-- Data model: extensions, tables, indexes and triggers.
-- Paste into the Supabase SQL Editor BEFORE 0002_rls.sql.
-- Runs in a single transaction: if anything fails, nothing is applied.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Extensions (Supabase keeps them in the "extensions" schema)
-- -----------------------------------------------------------------------------
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text,
  avatar_url          text,
  role                text not null default 'user' check (role in ('user', 'admin')),
  origin_country      text not null default 'CO' check (origin_country ~ '^[A-Z]{2}$'),
  destination_country text not null default 'PE' check (destination_country ~ '^[A-Z]{2}$'),
  destination_city    text not null default 'Piura',
  onboarded           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Content tables. Common columns:
--   id, source_name, source_url, verified_at, verified_by, is_published,
--   created_at, updated_at
-- source_name / source_url are required: every piece of content shows its
-- source in <SourceBadge>.
-- -----------------------------------------------------------------------------

create table public.medicines (
  id                uuid primary key default gen_random_uuid(),
  brand_name_pe     text not null,
  active_ingredient text not null,
  presentation      text,
  general_use       text,
  equivalent_co     text,          -- "equivalente referencial" in Colombia
  where_to_buy      text,
  warning           text not null default
    'Información referencial. No reemplaza la consulta con un profesional de la salud ni la orientación de un químico farmacéutico. Verifica el registro sanitario en DIGEMID.',
  digemid_url       text not null,
  keywords          text[] not null default '{}',
  source_name       text not null,
  source_url        text not null check (source_url ~* '^https?://'),
  verified_at       date null,
  verified_by       uuid references public.profiles (id) on delete set null,
  is_published      boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint medicines_digemid_url_http check (digemid_url ~* '^https?://'),
  -- Project rule: never use the words "sustituto" or "intercambiable".
  constraint medicines_forbidden_words check (
    concat_ws(' ', brand_name_pe, active_ingredient, presentation, general_use,
              equivalent_co, where_to_buy, warning, array_to_string(keywords, ' '))
    !~* '(sustitut|intercambiab)'
  )
);

create table public.foods (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  main_ingredients text,
  similar_co       text,
  where_to_try     text,
  image_url        text,
  keywords         text[] not null default '{}',
  source_name      text not null,
  source_url       text not null check (source_url ~* '^https?://'),
  verified_at      date null,
  verified_by      uuid references public.profiles (id) on delete set null,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.places (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text not null check (category in
                 ('turistico', 'comida', 'salud', 'tramites', 'compras', 'universidad')),
  description  text,
  address      text,
  lat          double precision check (lat between -90 and 90),
  lng          double precision check (lng between -180 and 180),
  hours        text,
  price_info   text,
  image_url    text,
  source_name  text not null,
  source_url   text not null check (source_url ~* '^https?://'),
  verified_at  date null,
  verified_by  uuid references public.profiles (id) on delete set null,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.transport_routes (
  id               uuid primary key default gen_random_uuid(),
  code             text,
  name             text not null,
  mode             text not null check (mode in ('combi', 'mototaxi', 'bus', 'colectivo', 'taxi')),
  origin_name      text,
  origin_lat       double precision check (origin_lat between -90 and 90),
  origin_lng       double precision check (origin_lng between -180 and 180),
  destination_name text,
  destination_lat  double precision check (destination_lat between -90 and 90),
  destination_lng  double precision check (destination_lng between -180 and 180),
  path             jsonb check (path is null or jsonb_typeof(path) = 'array'), -- [[lat, lng], ...] for Leaflet
  fare_min         numeric(8, 2) check (fare_min >= 0),
  fare_max         numeric(8, 2) check (fare_max >= 0),
  schedule         text,
  tips             text,
  source_name      text not null,
  source_url       text not null check (source_url ~* '^https?://'),
  verified_at      date null,
  verified_by      uuid references public.profiles (id) on delete set null,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint transport_routes_fare_range check (
    fare_min is null or fare_max is null or fare_min <= fare_max
  )
);

create table public.slang_terms (
  id            uuid primary key default gen_random_uuid(),
  term          text not null,
  meaning       text not null,
  equivalent_co text,
  example       text,
  category      text,
  source_name   text not null,
  source_url    text not null check (source_url ~* '^https?://'),
  verified_at   date null,
  verified_by   uuid references public.profiles (id) on delete set null,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.customs (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  category     text,
  icon         text,
  source_name  text not null,
  source_url   text not null check (source_url ~* '^https?://'),
  verified_at  date null,
  verified_by  uuid references public.profiles (id) on delete set null,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Community: reviews, reports, tips
-- -----------------------------------------------------------------------------

-- target_id is polymorphic (places / transport_routes / foods), so no FK.
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type  text not null check (target_type in ('place', 'route', 'food')),
  target_id    uuid not null,
  rating       smallint not null check (rating between 1 and 5),
  body         text check (char_length(body) <= 500),
  status       text not null default 'visible' check (status in ('visible', 'hidden')),
  report_count integer not null default 0 check (report_count >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  review_id   uuid not null references public.reviews (id) on delete cascade,
  reason      text not null check (char_length(reason) between 1 and 500),
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (reporter_id, review_id)
);

create table public.tips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category    text,
  body        text not null check (char_length(body) between 1 and 500),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- AI and utilities
-- -----------------------------------------------------------------------------

create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create table public.ai_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  feature    text not null check (feature in ('chat', 'photo_medicine', 'photo_food')),
  created_at timestamptz not null default now()
);

create table public.exchange_rates (
  id         uuid primary key default gen_random_uuid(),
  base       text not null check (base ~ '^[A-Z]{3}$'),
  quote      text not null check (quote ~ '^[A-Z]{3}$'),
  rate       numeric(20, 10) not null check (rate > 0),
  fetched_at timestamptz not null default now(),
  source     text not null
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

-- Fuzzy search (ilike / similarity) on medicines and foods.
create index medicines_brand_name_pe_trgm_idx
  on public.medicines using gin (brand_name_pe extensions.gin_trgm_ops);
create index medicines_active_ingredient_trgm_idx
  on public.medicines using gin (active_ingredient extensions.gin_trgm_ops);
create index foods_name_trgm_idx
  on public.foods using gin (name extensions.gin_trgm_ops);

create index places_category_idx          on public.places (category);
create index transport_routes_mode_idx    on public.transport_routes (mode);
create index reviews_target_idx           on public.reviews (target_type, target_id);
create index reports_review_id_idx        on public.reports (review_id);
create index reports_status_idx           on public.reports (status);
create index tips_status_idx              on public.tips (status);
create index tips_user_id_idx             on public.tips (user_id);
create index chat_messages_user_idx       on public.chat_messages (user_id, created_at desc);
create index ai_usage_user_feature_idx    on public.ai_usage (user_id, feature, created_at desc);
create index exchange_rates_pair_idx      on public.exchange_rates (base, quote, fetched_at desc);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.medicines
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.foods
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.places
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.transport_routes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.slang_terms
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.customs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tips
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- New auth user -> profile row
-- Google sends full_name/name and avatar_url/picture in raw_user_meta_data.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- New report -> report_count + 1; hide the review at 3 reports.
-- security definer: the reporter cannot update someone else's review directly.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reviews
     set report_count = report_count + 1,
         status = case when report_count + 1 >= 3 then 'hidden' else status end
   where id = new.review_id;
  return new;
end;
$$;

create trigger on_report_created
  after insert on public.reports
  for each row execute function public.handle_new_report();

-- Trigger functions are not meant to be called directly.
revoke execute on function public.handle_new_user()   from public, anon, authenticated;
revoke execute on function public.handle_new_report() from public, anon, authenticated;

commit;
