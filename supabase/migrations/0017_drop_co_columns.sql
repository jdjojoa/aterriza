-- =============================================================================
-- Aterriza · 0017_drop_co_columns.sql
-- Removes everything that assumed Colombia.
--
-- ⚠️  Run it ONLY after feat/estudiantes-nacionales is merged into main and
--     deployed: the previous production code still reads these columns.
--
-- Paste into the Supabase SQL Editor AFTER 0014–0016.
--
-- 1. Drops the temporary sync trigger (0016).
-- 2. Drops search_slang_terms (0005); the app uses search_slang_terms_v2.
-- 3. Drops medicines.equivalent_co, foods.similar_co, slang_terms.equivalent_co
--    (their data lives in public.equivalents since 0016) and recreates the
--    medicine forbidden-words rule without the old column.
-- 4. Moves the "Ojo: en Colombia…" notes out of the slang meanings into the
--    Colombian equivalent, so the meaning works for everyone.
-- 5. profiles.origin_country no longer defaults to 'CO'.
-- =============================================================================

begin;

-- 1. Sync trigger
drop trigger if exists sync_legacy_co_equivalent on public.medicines;
drop trigger if exists sync_legacy_co_equivalent on public.foods;
drop trigger if exists sync_legacy_co_equivalent on public.slang_terms;
drop function if exists public.sync_legacy_co_equivalent();

-- 2. Old slang search
drop function if exists public.search_slang_terms(text[], integer);

-- 3. Last copy (in case main wrote after 0016) and drop of the old columns.
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

alter table public.medicines drop constraint if exists medicines_forbidden_words;
alter table public.medicines   drop column if exists equivalent_co;
alter table public.foods       drop column if exists similar_co;
alter table public.slang_terms drop column if exists equivalent_co;

alter table public.medicines
  add constraint medicines_forbidden_words check (
    concat_ws(' ', brand_name_pe, active_ingredient, presentation, general_use,
              where_to_buy, warning, array_to_string(keywords, ' '))
    !~* '(sustitut|intercambiab)'
  );

-- 4. "Ojo: en Colombia …" belongs to the Colombian equivalent, not the meaning.
with notes as (
  select s.id,
         btrim(substring(s.meaning from '(Ojo: en Colombia.*)$')) as note,
         btrim(regexp_replace(s.meaning, '\s*Ojo: en Colombia.*$', '')) as clean_meaning
    from public.slang_terms s
   where s.meaning ~ 'Ojo: en Colombia'
),
moved as (
  insert into public.equivalents (content_type, content_id, country_code, equivalent_text)
  select 'slang', n.id, 'CO', left(n.note, 300) from notes n
  on conflict (content_type, content_id, country_code) do update
     set equivalent_text = left(public.equivalents.equivalent_text || '. ' || excluded.equivalent_text, 300)
   where strpos(public.equivalents.equivalent_text, excluded.equivalent_text) = 0
  returning content_id
)
update public.slang_terms s
   set meaning = n.clean_meaning
  from notes n
 where s.id = n.id
   and n.clean_meaning <> '';

-- 5. No default country. New profiles get it in onboarding.
alter table public.profiles alter column origin_country drop default;
alter table public.profiles alter column origin_country drop not null;

commit;
