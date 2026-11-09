-- =============================================================================
-- Aterriza · 0002_rls.sql
-- Row Level Security: enable on every table, helpers and policies.
-- Paste into the Supabase SQL Editor AFTER 0001_schema.sql.
--
-- Reminder: service_role (server only, SUPABASE_SERVICE_ROLE_KEY) bypasses RLS.
-- "Only service role can write" = no write policy for anon/authenticated.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Enable RLS on every table
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.medicines        enable row level security;
alter table public.foods            enable row level security;
alter table public.places           enable row level security;
alter table public.transport_routes enable row level security;
alter table public.slang_terms      enable row level security;
alter table public.customs          enable row level security;
alter table public.reviews          enable row level security;
alter table public.reports          enable row level security;
alter table public.tips             enable row level security;
alter table public.chat_messages    enable row level security;
alter table public.ai_usage         enable row level security;
alter table public.exchange_rates   enable row level security;

-- -----------------------------------------------------------------------------
-- is_admin(): security definer so it reads profiles without hitting RLS
-- (avoids infinite recursion in profiles policies).
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant  execute on function public.is_admin() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Content: public read when published (admin also sees drafts);
-- insert / update / delete only admin.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['medicines', 'foods', 'places', 'transport_routes', 'slang_terms', 'customs']
  loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated
         using (is_published or (select public.is_admin()))',
      t || '_select_published', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select public.is_admin()))',
      t || '_insert_admin', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))',
      t || '_update_admin', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select public.is_admin()))',
      t || '_delete_admin', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles: each user reads and edits their own row (admin reads all).
-- No insert policy: rows are created by the handle_new_user trigger.
-- -----------------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- RLS cannot compare old vs new values, so a trigger blocks role changes
-- coming from the API. SQL Editor (postgres) and service_role are allowed.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated') then
    raise exception 'No puedes cambiar tu rol.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger prevent_role_change before update on public.profiles
  for each row execute function public.prevent_role_change();

-- -----------------------------------------------------------------------------
-- reviews: everyone sees visible ones, authors also see their own (even hidden),
-- admin sees all. Authors insert/update/delete their own; admin can moderate.
-- -----------------------------------------------------------------------------
create policy reviews_select on public.reviews
  for select to anon, authenticated
  using (
    status = 'visible'
    or user_id = (select auth.uid())
    or (select public.is_admin())
  );

create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy reviews_update_own_or_admin on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

create policy reviews_delete_own_or_admin on public.reviews
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Authors cannot touch moderation fields (status, report_count) nor move a
-- review to another author/target. Admin, service_role and SQL Editor can.
-- handle_new_report runs as security definer (postgres), so it is not affected.
create or replace function public.protect_review_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'visible';
    new.report_count := 0;
  else
    new.status := old.status;
    new.report_count := old.report_count;
    new.user_id := old.user_id;
    new.target_type := old.target_type;
    new.target_id := old.target_id;
  end if;
  return new;
end;
$$;

create trigger protect_review_moderation before insert or update on public.reviews
  for each row execute function public.protect_review_moderation();

-- -----------------------------------------------------------------------------
-- reports: any authenticated user reports (not their own review);
-- only admin reads and resolves.
-- -----------------------------------------------------------------------------
create policy reports_insert_authenticated on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and resolved_by is null
    and resolved_at is null
    and not exists (
      select 1 from public.reviews r
      where r.id = review_id and r.user_id = (select auth.uid())
    )
  );

create policy reports_select_admin on public.reports
  for select to authenticated
  using ((select public.is_admin()));

create policy reports_update_admin on public.reports
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- tips: users submit their own (always pending); they see their own and the
-- approved ones; admin reviews.
-- -----------------------------------------------------------------------------
create policy tips_insert_own on public.tips
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
  );

create policy tips_select on public.tips
  for select to anon, authenticated
  using (
    status = 'approved'
    or user_id = (select auth.uid())
    or (select public.is_admin())
  );

create policy tips_update_admin on public.tips
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- chat_messages: only your own (read, insert, delete history).
-- -----------------------------------------------------------------------------
create policy chat_messages_select_own on public.chat_messages
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy chat_messages_insert_own on public.chat_messages
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy chat_messages_delete_own on public.chat_messages
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- ai_usage: writes only via service_role (API routes). Users may read their own
-- usage to show "te quedan N consultas hoy".
-- -----------------------------------------------------------------------------
create policy ai_usage_select_own on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate on public.ai_usage from anon, authenticated;

-- -----------------------------------------------------------------------------
-- exchange_rates: public read; writes only via service_role.
-- -----------------------------------------------------------------------------
create policy exchange_rates_select_public on public.exchange_rates
  for select to anon, authenticated
  using (true);

revoke insert, update, delete, truncate on public.exchange_rates from anon, authenticated;

commit;
