-- =============================================================================
-- Aterriza · 0010_admin_users.sql
-- User management for /admin/usuarios.
-- Paste into the Supabase SQL Editor AFTER 0001–0009.
--
-- 1. admin_list_users(): admins list users with their email. The email is read
--    from auth.users only inside this security definer function.
-- 2. admin_set_user_role(): admins change another user's role. Rules:
--      - caller must be admin (public.is_admin());
--      - an admin cannot change their own role;
--      - there is always at least one admin left.
--    The function runs as its owner, so the prevent_role_change trigger lets it
--    through; direct UPDATEs from the API (anon/authenticated) are still blocked.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. List users (admin only).
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search text default null,
  p_limit  integer default 200
)
returns table (
  id             uuid,
  full_name      text,
  email          text,
  origin_country text,
  role           text,
  created_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede ver los usuarios.' using errcode = '42501';
  end if;

  -- Escape LIKE wildcards so the search is literal.
  if q is not null then
    q := '%' || replace(replace(replace(left(q, 80), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
    select p.id, p.full_name, u.email::text, p.origin_country, p.role, p.created_at
      from public.profiles p
      join auth.users u on u.id = p.id
     where q is null
        or p.full_name ilike q
        or u.email ilike q
     order by p.created_at desc
     limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

revoke execute on function public.admin_list_users(text, integer) from public, anon;
grant  execute on function public.admin_list_users(text, integer) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Change a user's role (admin only).
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role    text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_role_value text;
  admin_count        integer;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar roles.' using errcode = '42501';
  end if;

  if p_role is null or p_role not in ('user', 'admin') then
    raise exception 'Rol no válido.' using errcode = '22023';
  end if;

  if p_user_id = (select auth.uid()) then
    raise exception 'No puedes cambiar tu propio rol.' using errcode = '42501';
  end if;

  -- Lock every admin row first so two concurrent demotions cannot leave
  -- the app without admins.
  perform 1 from public.profiles where role = 'admin' for update;

  select role into current_role_value
    from public.profiles
   where id = p_user_id
     for update;

  if not found then
    raise exception 'El usuario no existe.' using errcode = 'P0002';
  end if;

  if current_role_value = p_role then
    return p_role;
  end if;

  if current_role_value = 'admin' and p_role = 'user' then
    select count(*) into admin_count from public.profiles where role = 'admin';
    if admin_count <= 1 then
      raise exception 'Debe quedar al menos un administrador.' using errcode = '42501';
    end if;
  end if;

  update public.profiles
     set role = p_role, updated_at = now()
   where id = p_user_id;

  return p_role;
end;
$$;

revoke execute on function public.admin_set_user_role(uuid, text) from public, anon;
grant  execute on function public.admin_set_user_role(uuid, text) to authenticated, service_role;

commit;

-- Check (as an admin session the functions work; as a normal user they raise 42501):
-- select * from public.admin_list_users('ana');
