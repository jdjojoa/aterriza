-- =============================================================================
-- Aterriza · 0004_search_foods.sql
-- Fuzzy dish lookup for /identificar (unaccent + pg_trgm) by name and keywords.
-- Paste into the Supabase SQL Editor AFTER 0001, 0002 and 0003.
-- =============================================================================

begin;

-- Finds published foods whose name or one of its keywords matches p_name.
--
-- * similarity(): the whole name is close ("cebiche" vs "ceviche").
-- * word_similarity(term, query): the stored term appears inside what was
--   read ("causa" inside "causa rellena de pollo").
--
-- security invoker: RLS on public.foods still applies.
create or replace function public.search_foods(
  p_name text,
  p_limit integer default 3
)
returns setof public.foods
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select extensions.unaccent(lower(trim(coalesce(p_name, '')))) as name
  ),
  scored as (
    select
      f.id,
      (
        select max(greatest(
          extensions.similarity(q.name, t.term),
          extensions.word_similarity(t.term, q.name)
        ))
        from (
          select extensions.unaccent(lower(trim(x))) as term
          from unnest(array_append(f.keywords, f.name)) as x
          where length(trim(x)) >= 3
        ) as t
      ) as score
    from public.foods as f
    cross join query as q
    where f.is_published and length(q.name) >= 3
  )
  select f.*
  from public.foods as f
  join scored as s on s.id = f.id
  where s.score >= 0.6
  order by s.score desc, f.verified_at desc nulls last, f.name
  limit greatest(1, least(coalesce(p_limit, 3), 10));
$$;

grant execute on function public.search_foods(text, integer) to anon, authenticated;

commit;
