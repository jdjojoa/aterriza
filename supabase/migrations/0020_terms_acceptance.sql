-- =============================================================================
-- Aterriza · 0020_terms_acceptance.sql
-- profiles.terms_accepted_at: when the user accepted the Terms of use and the
-- Privacy policy (and confirmed being 18 or older). Paste into the Supabase SQL
-- Editor AFTER 0019.
--
-- 100 % compatible with the current production code (main): one nullable
-- column. Existing users stay null, so the new code asks them once.
-- =============================================================================

begin;

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz null;

-- The date always comes from the server clock, and an acceptance cannot be
-- erased from the client.
create or replace function public.stamp_terms_accepted_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.terms_accepted_at is not null then
      new.terms_accepted_at := now();
    end if;
  elsif new.terms_accepted_at is distinct from old.terms_accepted_at then
    if new.terms_accepted_at is null then
      new.terms_accepted_at := old.terms_accepted_at;
    else
      new.terms_accepted_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_terms_accepted_at on public.profiles;
create trigger stamp_terms_accepted_at before insert or update of terms_accepted_at on public.profiles
  for each row execute function public.stamp_terms_accepted_at();

commit;
