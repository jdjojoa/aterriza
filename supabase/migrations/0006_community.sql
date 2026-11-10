-- =============================================================================
-- Aterriza · 0006_community.sql
-- Read helpers for reviews and tips that show the author's first name.
-- Paste into the Supabase SQL Editor AFTER 0001–0005.
--
-- Why security definer: profiles RLS only lets each user read their own row,
-- so a plain join cannot show other authors' names. These functions expose
-- only the first name and re-apply the same visibility rules as the
-- reviews/tips select policies.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- get_reviews: visible reviews of a target plus the caller's own (even hidden).
-- reported_by_me lets the UI disable "Reportar" (reports are admin-only reads).
-- -----------------------------------------------------------------------------
create or replace function public.get_reviews(
  p_target_type text,
  p_target_id uuid
)
returns table (
  id             uuid,
  author_name    text,
  rating         smallint,
  body           text,
  status         text,
  is_own         boolean,
  reported_by_me boolean,
  created_at     timestamptz,
  updated_at     timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Usuario') as author_name,
    r.rating,
    r.body,
    r.status,
    r.user_id = (select auth.uid()) as is_own,
    exists (
      select 1 from public.reports rp
      where rp.review_id = r.id and rp.reporter_id = (select auth.uid())
    ) as reported_by_me,
    r.created_at,
    r.updated_at
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.target_type = p_target_type
    and r.target_id = p_target_id
    and (r.status = 'visible' or r.user_id = (select auth.uid()))
  order by (r.user_id = (select auth.uid())) desc, r.created_at desc
  limit 200;
$$;

-- -----------------------------------------------------------------------------
-- get_approved_tips: approved tips from everyone, newest first.
-- -----------------------------------------------------------------------------
create or replace function public.get_approved_tips(p_limit integer default 50)
returns table (
  id          uuid,
  author_name text,
  category    text,
  body        text,
  created_at  timestamptz,
  updated_at  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Usuario') as author_name,
    t.category,
    t.body,
    t.created_at,
    t.updated_at
  from public.tips t
  left join public.profiles p on p.id = t.user_id
  where t.status = 'approved'
  order by t.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke execute on function public.get_reviews(text, uuid)     from public, anon;
revoke execute on function public.get_approved_tips(integer)  from public, anon;
grant  execute on function public.get_reviews(text, uuid)     to authenticated, service_role;
grant  execute on function public.get_approved_tips(integer)  to authenticated, service_role;

commit;
