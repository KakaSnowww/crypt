drop policy if exists crypt_direct_attachments_select on storage.objects;
drop policy if exists crypt_direct_attachments_delete on storage.objects;

create policy crypt_direct_attachments_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'direct-message-attachments'
  and public.can_view_direct_attachment(name)
);

create policy crypt_direct_attachments_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'direct-message-attachments'
  and public.can_delete_direct_attachment(name)
);
