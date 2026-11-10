-- =============================================================================
-- Aterriza · 0008_tips_author_edit.sql
-- Authors can edit and delete their own tips.
-- Paste into the Supabase SQL Editor AFTER 0001–0007.
--
-- Moderation stays in charge: any edit by the author (not an admin) sends the
-- tip back to 'pending' and clears reviewed_by, so an approved tip disappears
-- from "De la comunidad" until the team approves it again. A trigger enforces
-- this; the WITH CHECK of the update policy is a second guard.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Author edits -> back to pending. Admins (moderation) and service_role
-- (scripts) are not affected. user_id and created_at cannot be changed.
-- -----------------------------------------------------------------------------
create or replace function public.tips_author_edit_to_pending()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.user_id     := old.user_id;
    new.created_at  := old.created_at;
    new.status      := 'pending';
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tips_author_edit_to_pending on public.tips;
create trigger tips_author_edit_to_pending before update on public.tips
  for each row execute function public.tips_author_edit_to_pending();

-- -----------------------------------------------------------------------------
-- Policies. tips_update_admin (0002) stays for moderation.
-- -----------------------------------------------------------------------------
drop policy if exists tips_update_own on public.tips;
drop policy if exists tips_delete_own on public.tips;

create policy tips_update_own on public.tips
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
  );

create policy tips_delete_own on public.tips
  for delete to authenticated
  using (user_id = (select auth.uid()));

commit;
