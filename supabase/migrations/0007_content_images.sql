-- =============================================================================
-- Aterriza · 0007_content_images.sql
-- Public Storage bucket for content photos (foods, places) uploaded from /admin.
-- Paste into the Supabase SQL Editor AFTER 0001–0006.
--
-- Public bucket: anyone can read files through their public URL, no policy
-- needed. Only admins (public.is_admin()) can upload, replace or delete.
-- Max 500 KB per file; the browser compresses images before uploading.
-- =============================================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-images',
  'content-images',
  true,
  512000,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists content_images_select_admin on storage.objects;
drop policy if exists content_images_insert_admin on storage.objects;
drop policy if exists content_images_update_admin on storage.objects;
drop policy if exists content_images_delete_admin on storage.objects;

-- Listing (not needed for public URLs) stays admin-only.
create policy content_images_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'content-images' and (select public.is_admin()));

create policy content_images_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'content-images' and (select public.is_admin()));

create policy content_images_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'content-images' and (select public.is_admin()))
  with check (bucket_id = 'content-images' and (select public.is_admin()));

create policy content_images_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'content-images' and (select public.is_admin()));

commit;
