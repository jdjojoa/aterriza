-- =============================================================================
-- Aterriza · 0009_simplify_verification.sql
-- Simpler content verification and instant community tips.
-- Paste into the Supabase SQL Editor AFTER 0001–0008.
--
-- 1. Source is optional for foods, places, slang_terms and customs. Medicines
--    and transport_routes keep a required source (safety rule).
-- 2. All existing content is published.
-- 3. Tips publish instantly ('approved' by default). Authors can edit without
--    losing the status. Anyone can report someone else's tip; at 3 reports the
--    tip goes back to 'pending' (hidden) and waits in the admin queue — same
--    rule as reviews.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Optional source on non-safety content.
-- The http(s) check on source_url still applies when a value is present.
-- -----------------------------------------------------------------------------
alter table public.foods
  alter column source_name drop not null,
  alter column source_url  drop not null;
alter table public.places
  alter column source_name drop not null,
  alter column source_url  drop not null;
alter table public.slang_terms
  alter column source_name drop not null,
  alter column source_url  drop not null;
alter table public.customs
  alter column source_name drop not null,
  alter column source_url  drop not null;

-- -----------------------------------------------------------------------------
-- 2. Publish all existing content.
-- -----------------------------------------------------------------------------
update public.medicines        set is_published = true where not is_published;
update public.foods            set is_published = true where not is_published;
update public.places           set is_published = true where not is_published;
update public.transport_routes set is_published = true where not is_published;
update public.slang_terms      set is_published = true where not is_published;
update public.customs          set is_published = true where not is_published;

-- -----------------------------------------------------------------------------
-- 3a. Tips: instant publishing + report counter.
-- -----------------------------------------------------------------------------
alter table public.tips alter column status set default 'approved';
alter table public.tips
  add column if not exists report_count integer not null default 0
  check (report_count >= 0);

-- Authors cannot touch moderation fields. Replaces 0008's "edit -> pending".
-- Admin, service_role and handle_new_report (security definer) are not affected.
drop trigger if exists tips_author_edit_to_pending on public.tips;
drop function if exists public.tips_author_edit_to_pending();

create or replace function public.protect_tip_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status       := 'approved';
    new.report_count := 0;
    new.reviewed_by  := null;
  else
    new.status       := old.status;
    new.report_count := old.report_count;
    new.reviewed_by  := old.reviewed_by;
    new.user_id      := old.user_id;
    new.created_at   := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_tip_moderation on public.tips;
create trigger protect_tip_moderation before insert or update on public.tips
  for each row execute function public.protect_tip_moderation();

revoke execute on function public.protect_tip_moderation() from public, anon, authenticated;

drop policy if exists tips_insert_own on public.tips;
create policy tips_insert_own on public.tips
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists tips_update_own on public.tips;
create policy tips_update_own on public.tips
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 3b. Reports can target a review or a tip (exactly one).
-- -----------------------------------------------------------------------------
alter table public.reports alter column review_id drop not null;
alter table public.reports
  add column if not exists tip_id uuid references public.tips (id) on delete cascade;

alter table public.reports drop constraint if exists reports_one_target;
alter table public.reports
  add constraint reports_one_target check (num_nonnulls(review_id, tip_id) = 1);

alter table public.reports drop constraint if exists reports_reporter_tip_unique;
alter table public.reports
  add constraint reports_reporter_tip_unique unique (reporter_id, tip_id);

create index if not exists reports_tip_id_idx on public.reports (tip_id);

drop policy if exists reports_insert_authenticated on public.reports;
create policy reports_insert_authenticated on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and resolved_by is null
    and resolved_at is null
    and (
      (
        review_id is not null
        and not exists (
          select 1 from public.reviews r
          where r.id = review_id and r.user_id = (select auth.uid())
        )
      )
      or (
        tip_id is not null
        and exists (
          select 1 from public.tips t
          where t.id = tip_id
            and t.status = 'approved'
            and t.user_id <> (select auth.uid())
        )
      )
    )
  );

-- New report -> report_count + 1 on its target; hide at 3 reports.
create or replace function public.handle_new_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.review_id is not null then
    update public.reviews
       set report_count = report_count + 1,
           status = case when report_count + 1 >= 3 then 'hidden' else status end
     where id = new.review_id;
  else
    update public.tips
       set report_count = report_count + 1,
           status = case
             when report_count + 1 >= 3 and status = 'approved' then 'pending'
             else status
           end
     where id = new.tip_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_report() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3c. get_approved_tips: adds is_own and reported_by_me for the "Reportar" button.
-- -----------------------------------------------------------------------------
drop function if exists public.get_approved_tips(integer);

create function public.get_approved_tips(p_limit integer default 50)
returns table (
  id             uuid,
  author_name    text,
  category       text,
  body           text,
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
    t.id,
    coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Usuario') as author_name,
    t.category,
    t.body,
    t.user_id = (select auth.uid()) as is_own,
    exists (
      select 1 from public.reports rp
      where rp.tip_id = t.id and rp.reporter_id = (select auth.uid())
    ) as reported_by_me,
    t.created_at,
    t.updated_at
  from public.tips t
  left join public.profiles p on p.id = t.user_id
  where t.status = 'approved'
  order by t.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke execute on function public.get_approved_tips(integer) from public, anon;
grant  execute on function public.get_approved_tips(integer) to authenticated, service_role;

commit;
