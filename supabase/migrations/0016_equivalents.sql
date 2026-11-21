-- =============================================================================
-- Aterriza · 0016_equivalents.sql
-- Country-specific equivalents, "Piurano" slang and rates for every currency.
-- Paste into the Supabase SQL Editor AFTER 0014 and 0015.
--
-- 100 % compatible with the current production code (main):
--   * medicines.equivalent_co, foods.similar_co and slang_terms.equivalent_co
--     are NOT touched; their data is COPIED to the new table.
--   * search_medicines, search_foods and search_slang_terms are NOT touched.
--     The new code uses the new search_slang_terms_v2.
--   * exchange_rates is NOT touched (main reads its latest batch with a row
--     limit, so a bigger batch there would hide currencies from main). The new
--     code stores the full API response in exchange_rate_snapshots.
--   * While main is in production, a trigger copies every change of the old
--     *_co columns (made from main's admin) to equivalents (country 'CO').
--   0017 drops the old columns, the old function and the sync trigger.
--
-- 1. equivalents (+ RLS, rules, cleanup trigger) and copy of the CO data.
-- 2. Sync trigger: old *_co columns → equivalents (only until 0017).
-- 3. slang_terms.is_piurano.
-- 4. search_slang_terms_v2(p_terms, p_country).
-- 5. exchange_rate_snapshots.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. equivalents
-- content_id is polymorphic (medicines / foods / slang_terms), so no FK; a
-- trigger deletes the equivalents of a deleted row.
-- -----------------------------------------------------------------------------
create table if not exists public.equivalents (
  id              uuid primary key default gen_random_uuid(),
  content_type    text not null check (content_type in ('medicine', 'food', 'slang')),
  content_id      uuid not null,
  country_code    text not null check (country_code ~ '^[A-Z]{2}$' and country_code <> 'PE'),
  equivalent_text text not null check (char_length(btrim(equivalent_text)) between 1 and 300),
  brand_names     text[] not null default '{}' check (cardinality(brand_names) <= 20),
  source_name     text check (char_length(source_name) <= 200),
  source_url      text check (source_url ~* '^https?://'),
  verified_at     date null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (content_type, content_id, country_code),
  -- Project rule: never "sustituto" / "intercambiable" in medicine text.
  constraint equivalents_medicine_forbidden_words check (
    content_type <> 'medicine'
    or concat_ws(' ', equivalent_text, array_to_string(brand_names, ' '))
       !~* '(sustitut|intercambiab)'
  )
);

create index if not exists equivalents_lookup_idx
  on public.equivalents (content_type, country_code, content_id);

drop trigger if exists set_updated_at on public.equivalents;
create trigger set_updated_at before update on public.equivalents
  for each row execute function public.set_updated_at();

alter table public.equivalents enable row level security;

drop policy if exists equivalents_select_public on public.equivalents;
create policy equivalents_select_public on public.equivalents
  for select to anon, authenticated
  using (true);

drop policy if exists equivalents_insert_admin on public.equivalents;
create policy equivalents_insert_admin on public.equivalents
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists equivalents_update_admin on public.equivalents;
create policy equivalents_update_admin on public.equivalents
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists equivalents_delete_admin on public.equivalents;
create policy equivalents_delete_admin on public.equivalents
  for delete to authenticated
  using ((select public.is_admin()));

-- Deleting a medicine / food / slang term deletes its equivalents.
create or replace function public.delete_content_equivalents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.equivalents
   where content_type = tg_argv[0]
     and content_id = old.id;
  return old;
end;
$$;

revoke execute on function public.delete_content_equivalents() from public, anon, authenticated;

drop trigger if exists delete_equivalents on public.medicines;
create trigger delete_equivalents after delete on public.medicines
  for each row execute function public.delete_content_equivalents('medicine');
drop trigger if exists delete_equivalents on public.foods;
create trigger delete_equivalents after delete on public.foods
  for each row execute function public.delete_content_equivalents('food');
drop trigger if exists delete_equivalents on public.slang_terms;
create trigger delete_equivalents after delete on public.slang_terms
  for each row execute function public.delete_content_equivalents('slang');

-- Copy the current Colombian data. The source is the one of the parent row.
insert into public.equivalents
  (content_type, content_id, country_code, equivalent_text, source_name, source_url, verified_at)
select 'medicine', m.id, 'CO', btrim(m.equivalent_co), m.source_name, m.source_url, m.verified_at
  from public.medicines m
 where nullif(btrim(m.equivalent_co), '') is not null
union all
select 'food', f.id, 'CO', btrim(f.similar_co), f.source_name, f.source_url, null
  from public.foods f
 where nullif(btrim(f.similar_co), '') is not null
union all
select 'slang', s.id, 'CO', btrim(s.equivalent_co), s.source_name, s.source_url, null
  from public.slang_terms s
 where nullif(btrim(s.equivalent_co), '') is not null
on conflict (content_type, content_id, country_code) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Sync trigger (temporary, dropped in 0017): when main's admin writes an
-- old *_co column, the 'CO' equivalent follows. The new code never writes
-- those columns, so this only reacts to main.
-- tg_argv: [content_type, legacy column].
-- -----------------------------------------------------------------------------
create or replace function public.sync_legacy_co_equivalent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind      text := tg_argv[0];
  new_value text := nullif(btrim(to_jsonb(new) ->> tg_argv[1]), '');
  old_value text := case when tg_op = 'UPDATE'
                         then nullif(btrim(to_jsonb(old) ->> tg_argv[1]), '') end;
begin
  if tg_op = 'UPDATE' and new_value is not distinct from old_value then
    return new;
  end if;

  if new_value is null then
    delete from public.equivalents
     where content_type = kind and content_id = new.id and country_code = 'CO';
  else
    insert into public.equivalents
      (content_type, content_id, country_code, equivalent_text, source_name, source_url)
    values (kind, new.id, 'CO', new_value, new.source_name, new.source_url)
    on conflict (content_type, content_id, country_code)
      do update set equivalent_text = excluded.equivalent_text;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_legacy_co_equivalent() from public, anon, authenticated;

drop trigger if exists sync_legacy_co_equivalent on public.medicines;
create trigger sync_legacy_co_equivalent after insert or update on public.medicines
  for each row execute function public.sync_legacy_co_equivalent('medicine', 'equivalent_co');
drop trigger if exists sync_legacy_co_equivalent on public.foods;
create trigger sync_legacy_co_equivalent after insert or update on public.foods
  for each row execute function public.sync_legacy_co_equivalent('food', 'similar_co');
drop trigger if exists sync_legacy_co_equivalent on public.slang_terms;
create trigger sync_legacy_co_equivalent after insert or update on public.slang_terms
  for each row execute function public.sync_legacy_co_equivalent('slang', 'equivalent_co');

-- -----------------------------------------------------------------------------
-- 3. slang_terms.is_piurano: words typical of Piura (shown with a "Piurano"
-- badge). Backfill: the terms whose meaning already says they are from Piura.
-- -----------------------------------------------------------------------------
alter table public.slang_terms
  add column if not exists is_piurano boolean not null default false;

update public.slang_terms
   set is_piurano = true
 where not is_piurano
   and extensions.unaccent(lower(meaning)) like '%piura%';

-- -----------------------------------------------------------------------------
-- 4. search_slang_terms_v2: same as search_slang_terms (0005) without the old
-- equivalent_co column; also searches the equivalent of p_country, if any.
-- A hit in `term` weighs 3, a hit in meaning / example / equivalent weighs 1.
-- security invoker: RLS on slang_terms and equivalents still applies.
-- -----------------------------------------------------------------------------
create or replace function public.search_slang_terms_v2(
  p_terms text[],
  p_country text default null,
  p_limit integer default 10
)
returns setof public.slang_terms
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select distinct extensions.unaccent(lower(trim(x))) as word
    from unnest(coalesce(p_terms, '{}'::text[])) as x
    where length(trim(x)) >= 3
    limit 16
  ),
  scored as (
    select
      s.id,
      sum(
        case
          when strpos(extensions.unaccent(lower(s.term)), q.word) > 0 then 3
          when strpos(
            extensions.unaccent(lower(concat_ws(' ', s.meaning, s.example, e.equivalent_text))),
            q.word
          ) > 0 then 1
          else 0
        end
      ) as score
    from public.slang_terms as s
    cross join query as q
    left join public.equivalents as e
      on e.content_type = 'slang'
     and e.content_id = s.id
     and e.country_code = upper(p_country)
    where s.is_published
    group by s.id
  )
  select s.*
  from public.slang_terms as s
  join scored as sc on sc.id = s.id
  where sc.score > 0
  order by sc.score desc, s.term
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

grant execute on function public.search_slang_terms_v2(text[], text, integer) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. exchange_rate_snapshots: one row per daily fetch with EVERY currency the
-- API returns ({"USD": 0.27, "PYG": 2100.5, ...}, units per 1 base).
-- Public read; writes only via service_role (no write policy).
-- -----------------------------------------------------------------------------
create table if not exists public.exchange_rate_snapshots (
  id         uuid primary key default gen_random_uuid(),
  base       text not null check (base ~ '^[A-Z]{3}$'),
  rates      jsonb not null check (jsonb_typeof(rates) = 'object'),
  fetched_at timestamptz not null default now(),
  source     text not null
);

create index if not exists exchange_rate_snapshots_base_idx
  on public.exchange_rate_snapshots (base, fetched_at desc);

alter table public.exchange_rate_snapshots enable row level security;

drop policy if exists exchange_rate_snapshots_select_public on public.exchange_rate_snapshots;
create policy exchange_rate_snapshots_select_public on public.exchange_rate_snapshots
  for select to anon, authenticated
  using (true);

revoke insert, update, delete, truncate on public.exchange_rate_snapshots from anon, authenticated;

commit;
