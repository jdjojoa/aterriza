-- =============================================================================
-- Aterriza · make_admin.sql
-- Promotes an account to admin. Run it in the Supabase SQL Editor AFTER
-- signing in to the app at least once (the profile is created on first login).
-- The SQL Editor runs as "postgres", so the prevent_role_change trigger allows it.
-- =============================================================================

do $$
declare
  admin_email constant text := 'ninjenderyt@gmail.com';
  updated_rows integer;
begin
  update public.profiles p
     set role = 'admin'
    from auth.users u
   where u.id = p.id
     and lower(u.email) = lower(admin_email);

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    raise exception 'No existe un perfil para %. Inicia sesión en la app primero.', admin_email;
  end if;

  raise notice 'Listo: % ahora es admin.', admin_email;
end;
$$;

-- Check:
-- select u.email, p.role from public.profiles p join auth.users u on u.id = p.id;
