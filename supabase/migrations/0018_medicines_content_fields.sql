-- =============================================================================
-- Aterriza · 0018_medicines_content_fields.sql
-- New medicine fields (concentration, Peruvian brands, sale condition) and the
-- department of each arrival route. Paste into the Supabase SQL Editor AFTER 0017.
--
-- 100 % compatible with the current production code (main):
--   * Only nullable / defaulted columns are added; nothing is renamed or dropped.
--   * search_medicines is NOT touched (brands are also copied to keywords).
--   * medicines_forbidden_words is recreated with the same rule, now also
--     covering the new text columns.
-- =============================================================================

begin;

alter table public.medicines
  add column if not exists concentration  text check (char_length(concentration) <= 100),
  add column if not exists brand_names_pe text[] not null default '{}'
    check (cardinality(brand_names_pe) <= 20),
  add column if not exists sale_condition text check (char_length(sale_condition) <= 300);

-- Project rule: never use the words "sustituto" or "intercambiable".
alter table public.medicines drop constraint if exists medicines_forbidden_words;
alter table public.medicines
  add constraint medicines_forbidden_words check (
    concat_ws(' ', brand_name_pe, active_ingredient, presentation, concentration,
              general_use, where_to_buy, warning, sale_condition,
              array_to_string(keywords, ' '), array_to_string(brand_names_pe, ' '))
    !~* '(sustitut|intercambiab)'
  );

alter table public.arrival_routes
  add column if not exists origin_department text
    check (char_length(origin_department) <= 80);

commit;
