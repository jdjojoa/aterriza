-- =============================================================================
-- Aterriza · 0019_admin_notes.sql
-- Internal notes that only admins can read (e.g. where the brand list came
-- from, what is still left to check). Paste into the Supabase SQL Editor AFTER 0018.
--
-- They live in their own table because medicines, equivalents and
-- arrival_routes are readable by anyone with the anon key: a column there
-- would be public.
--
-- 100 % compatible with the current production code (main): new table only.
-- =============================================================================

begin;

create table if not exists public.admin_notes (
  id            uuid primary key default gen_random_uuid(),
  target_table  text not null check (target_table in ('medicines', 'equivalents', 'arrival_routes')),
  target_id     uuid not null,
  notes         text check (char_length(notes) <= 2000),
  reference_url text check (reference_url ~* '^https?://'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (target_table, target_id)
);

drop trigger if exists set_updated_at on public.admin_notes;
create trigger set_updated_at before update on public.admin_notes
  for each row execute function public.set_updated_at();

alter table public.admin_notes enable row level security;

drop policy if exists admin_notes_admin_all on public.admin_notes;
create policy admin_notes_admin_all on public.admin_notes
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.admin_notes from anon;

-- Delete the note together with its row.
create or replace function public.delete_admin_notes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.admin_notes
   where target_table = tg_table_name
     and target_id = old.id;
  return old;
end;
$$;

revoke execute on function public.delete_admin_notes() from public, anon, authenticated;

drop trigger if exists delete_admin_notes on public.medicines;
create trigger delete_admin_notes after delete on public.medicines
  for each row execute function public.delete_admin_notes();
drop trigger if exists delete_admin_notes on public.equivalents;
create trigger delete_admin_notes after delete on public.equivalents
  for each row execute function public.delete_admin_notes();
drop trigger if exists delete_admin_notes on public.arrival_routes;
create trigger delete_admin_notes after delete on public.arrival_routes
  for each row execute function public.delete_admin_notes();

commit;
