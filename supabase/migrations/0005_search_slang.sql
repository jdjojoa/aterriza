-- =============================================================================
-- Aterriza · 0005_search_slang.sql
-- Accent-insensitive slang lookup (unaccent) used by the chatbot context.
-- Paste into the Supabase SQL Editor AFTER 0001–0004.
-- =============================================================================

begin;

-- Returns published slang terms that contain any of p_terms, ignoring case and
-- accents ("chevere" finds "Chévere", "gua" finds "¡Guá!").
-- A hit in `term` weighs 3, a hit in meaning / equivalent_co / example weighs 1.
-- strpos() instead of LIKE/regex: the input is matched literally.
--
-- security invoker: RLS on public.slang_terms still applies.
create or replace function public.search_slang_terms(
  p_terms text[],
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
            extensions.unaccent(lower(concat_ws(' ', s.meaning, s.equivalent_co, s.example))),
            q.word
          ) > 0 then 1
          else 0
        end
      ) as score
    from public.slang_terms as s
    cross join query as q
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

grant execute on function public.search_slang_terms(text[], integer) to anon, authenticated;

commit;
