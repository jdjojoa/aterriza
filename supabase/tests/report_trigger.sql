-- =============================================================================
-- Aterriza · tests/report_trigger.sql
-- Simulated check of handle_new_report: a review is hidden on its 3rd report.
-- Paste into the Supabase SQL Editor. Runs inside a transaction and ends with
-- ROLLBACK, so nothing is kept. Each step runs as role "authenticated" with a
-- fake JWT, so RLS applies exactly as for real users.
-- Expected: NOTICE lines "ok ..." and a final row status = hidden, report_count = 3.
-- The same check against the real API: npm run check:reports
-- =============================================================================

begin;

-- 1 author + 3 reporters (handle_new_user creates their profiles).
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'trigger-test-' || n || '@example.com', jsonb_build_object('full_name', 'Prueba ' || n)
from (values
  (0, 'aaaaaaaa-0000-4000-8000-000000000000'::uuid),
  (1, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid),
  (2, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid),
  (3, 'aaaaaaaa-0000-4000-8000-000000000003'::uuid)
) as u(n, id);

set local role authenticated;

-- Author writes a review (tries to preset moderation fields: ignored).
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-4000-8000-000000000000', 'role', 'authenticated')::text, true);
insert into public.reviews (id, target_type, target_id, rating, body, status, report_count)
values ('bbbbbbbb-0000-4000-8000-000000000000', 'place', gen_random_uuid(), 2, 'Prueba', 'hidden', 9);

do $$
declare
  i int;
  st text;
  cnt int;
begin
  for i in 1..3 loop
    perform set_config('request.jwt.claims', json_build_object('sub', ('aaaaaaaa-0000-4000-8000-00000000000' || i)::uuid, 'role', 'authenticated')::text, true);
    insert into public.reports (review_id, reason)
    values ('bbbbbbbb-0000-4000-8000-000000000000', 'ofensivo');

    -- What the reporter sees under RLS: the row disappears once hidden.
    select count(*) into cnt from public.reviews
     where id = 'bbbbbbbb-0000-4000-8000-000000000000';
    if i < 3 then
      assert cnt = 1, format('review should still be visible after %s reports', i);
    else
      assert cnt = 0, 'review should be hidden from reporters after 3 reports';
    end if;
    raise notice 'ok: % report(s), visible to reporter = %', i, cnt = 1;
  end loop;

  -- Same user, same review: rejected by unique (reporter_id, review_id).
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
    insert into public.reports (review_id, reason)
    values ('bbbbbbbb-0000-4000-8000-000000000000', 'spam');
    raise exception 'duplicate report should have failed';
  exception when unique_violation then
    raise notice 'ok: duplicate report rejected';
  end;

  -- Author still sees the hidden review.
  perform set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-4000-8000-000000000000', 'role', 'authenticated')::text, true);
  select status, report_count into st, cnt from public.reviews
   where id = 'bbbbbbbb-0000-4000-8000-000000000000';
  assert st = 'hidden' and cnt = 3, format('expected hidden/3, got %s/%s', st, cnt);
  raise notice 'ok: author sees status = %, report_count = %', st, cnt;
end;
$$;

reset role;
select status, report_count from public.reviews
 where id = 'bbbbbbbb-0000-4000-8000-000000000000';

rollback;
