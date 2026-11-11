-- =============================================================================
-- Aterriza · 0013_ai_usage_calls.sql
-- Gemini free-tier meter for /admin.
-- Paste into the Supabase SQL Editor AFTER 0001–0012.
--
-- 1. ai_usage now logs EVERY real Gemini call (a photo that also asks for a
--    description = 2 rows), including failed ones:
--      model           Gemini model id (null = rows written before 0013).
--      status          'ok' | 'error' | 'rate_limited' (Gemini answered 429).
--      counts_for_user true = the user's action itself (chat message, photo
--                      reading). Per-user daily limits count only rows with
--                      status = 'ok' and counts_for_user = true, so follow-up
--                      calls and failures do not eat the user's quota.
-- 2. admin_ai_usage_summary(p_since): calls per model, feature, status and
--    hour since p_since. Admin only (public.is_admin()).
-- =============================================================================

begin;

alter table public.ai_usage
  add column model text,
  add column status text not null default 'ok'
    check (status in ('ok', 'error', 'rate_limited')),
  add column counts_for_user boolean not null default true;

comment on column public.ai_usage.model is 'Gemini model id; null for rows before 0013.';
comment on column public.ai_usage.status is 'ok | error | rate_limited (HTTP 429 from Gemini).';
comment on column public.ai_usage.counts_for_user is
  'true = counts toward the user''s daily limit (when status = ok).';

create index ai_usage_created_at_idx on public.ai_usage (created_at desc);

create or replace function public.admin_ai_usage_summary(p_since timestamptz)
returns table (
  model   text,
  feature text,
  status  text,
  hour    timestamptz,
  calls   bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede ver el uso de IA.' using errcode = '42501';
  end if;

  return query
    select u.model, u.feature, u.status, date_trunc('hour', u.created_at), count(*)
      from public.ai_usage u
     where u.created_at >= p_since
     group by 1, 2, 3, 4;
end;
$$;

revoke execute on function public.admin_ai_usage_summary(timestamptz) from public, anon;
grant  execute on function public.admin_ai_usage_summary(timestamptz) to authenticated, service_role;

commit;
