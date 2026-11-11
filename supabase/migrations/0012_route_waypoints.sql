-- =============================================================================
-- Aterriza · 0012_route_waypoints.sql
-- Transport routes follow real streets.
-- Paste into the Supabase SQL Editor AFTER 0001–0011.
--
-- 1. transport_routes.waypoints: intermediate points the admin taps on the
--    mini map ([[lat, lng], ...]), because combis do not always take the
--    shortest way. Order: origin → waypoints → destination.
-- 2. transport_routes.path_source: how `path` was built.
--    'osrm'     = street geometry from the OSRM demo server (server side only).
--    'straight' = straight segments between the points (OSRM failed).
--    null       = legacy path (seed or hand drawn); treated as approximate.
-- =============================================================================

begin;

alter table public.transport_routes
  add column waypoints jsonb not null default '[]'::jsonb
    check (jsonb_typeof(waypoints) = 'array' and jsonb_array_length(waypoints) <= 25),
  add column path_source text
    check (path_source is null or path_source in ('osrm', 'straight'));

comment on column public.transport_routes.waypoints is
  'Intermediate [lat, lng] points between origin and destination, in order (max 25).';
comment on column public.transport_routes.path_source is
  'osrm = street geometry from OSRM; straight = fallback straight segments; null = legacy.';

commit;
