-- =============================================================================
-- Aterriza · 0003_search_medicines.sql
-- Fuzzy medicine lookup for /identificar (unaccent + pg_trgm).
-- Paste into the Supabase SQL Editor AFTER 0001 and 0002.
-- =============================================================================

begin;

-- Similarity between two already-normalized terms, tolerant to extra words
-- ("clorfenamina" vs "clorfenamina maleato").
create or replace function public.medicine_term_similarity(a text, b text)
returns real
language sql
immutable
parallel safe
set search_path = ''
as $$
  select greatest(
    extensions.similarity(a, b),
    extensions.word_similarity(a, b),
    extensions.word_similarity(b, a)
  );
$$;

-- Finds published medicines by active ingredients (preferred) or by name.
--
-- * With ingredients: every ingredient read on the package must match one in
--   the row AND every ingredient of the row must match one read on the package,
--   so "paracetamol + cafeína" does not return plain "paracetamol".
-- * Without ingredients: falls back to brand_name_pe / keywords.
--
-- security invoker: RLS on public.medicines still applies.
create or replace function public.search_medicines(
  p_brand_name text,
  p_active_ingredients text[],
  p_limit integer default 3
)
returns setof public.medicines
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select
      extensions.unaccent(lower(trim(coalesce(p_brand_name, '')))) as brand,
      array(
        select extensions.unaccent(lower(trim(i)))
        from unnest(coalesce(p_active_ingredients, '{}'::text[])) as i
        where trim(i) <> ''
      ) as ingredients
  ),
  scored as (
    select
      m.id,
      case when q.brand = '' then 0 else greatest(
        extensions.similarity(q.brand, extensions.unaccent(lower(m.brand_name_pe))),
        extensions.word_similarity(extensions.unaccent(lower(m.brand_name_pe)), q.brand),
        coalesce((
          select max(extensions.similarity(q.brand, extensions.unaccent(lower(k))))
          from unnest(m.keywords) as k
        ), 0)
      ) end as brand_score,
      case when cardinality(q.ingredients) = 0 or cardinality(parts.list) = 0 then 0 else least(
        (
          select avg(coalesce((
            select max(public.medicine_term_similarity(qi, mi)) from unnest(parts.list) as mi
          ), 0))
          from unnest(q.ingredients) as qi
        ),
        (
          select avg(coalesce((
            select max(public.medicine_term_similarity(mi, qi)) from unnest(q.ingredients) as qi
          ), 0))
          from unnest(parts.list) as mi
        )
      ) end as ingredient_score,
      cardinality(q.ingredients) > 0 as has_ingredients
    from public.medicines as m
    cross join query as q
    cross join lateral (
      select array(
        select extensions.unaccent(lower(trim(p)))
        from regexp_split_to_table(m.active_ingredient, '\s*[+,/;]\s*') as p
        where trim(p) <> ''
      ) as list
    ) as parts
    where m.is_published
  )
  select m.*
  from public.medicines as m
  join scored as s on s.id = m.id
  where case when s.has_ingredients then s.ingredient_score >= 0.6 else s.brand_score >= 0.6 end
  order by
    case when s.has_ingredients then s.ingredient_score + 0.1 * s.brand_score else s.brand_score end desc,
    m.verified_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 3), 10));
$$;

grant execute on function public.medicine_term_similarity(text, text) to anon, authenticated;
grant execute on function public.search_medicines(text, text[], integer) to anon, authenticated;

commit;
