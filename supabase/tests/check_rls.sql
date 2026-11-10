-- =============================================================================
-- Aterriza · check_rls.sql
-- Paste into the Supabase SQL Editor. Expected result of the first query: 0 rows.
-- =============================================================================

-- 1. Tables in "public" WITHOUT RLS enabled (must return no rows).
select n.nspname as schema, c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')        -- ordinary and partitioned tables
  and not c.relrowsecurity
order by 2;

-- 2. Overview: every public table, RLS flag and number of policies.
select c.relname                         as table_name,
       c.relrowsecurity                  as rls_enabled,
       c.relforcerowsecurity             as rls_forced,
       count(p.policyname)               as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by c.relname;

-- 3. Migrations 0003–0007 applied? (functions and Storage bucket the app needs)
select p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('search_medicines', 'search_foods', 'search_slang_terms',
                    'get_reviews', 'get_approved_tips')
order by 1;                                         -- expected: 5 rows

select id, public from storage.buckets where id = 'content-images';  -- expected: 1 row
