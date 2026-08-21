-- Crypt Pro: anexos de até 500 MB e avatar GIF de até 5 MB.

create or replace function public.get_my_attachment_limit(
  target_server_id uuid
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  personal_limit integer := 5242880;
  server_limit integer := 5242880;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if public.has_active_arcana(auth.uid()) then
    personal_limit := 524288000;
  end if;

  if target_server_id is not null
    and public.is_server_member(target_server_id)
  then
    select metrics.attachment_limit_bytes
    into server_limit
    from public.calculate_server_arcana_status(target_server_id) as metrics;
  end if;

  return greatest(
    personal_limit,
    coalesce(server_limit, 5242880)
  );
end;
$$;

create or replace function public.get_my_attachment_limit()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_my_attachment_limit(null::uuid);
$$;

alter table public.message_attachments
drop constraint if exists message_attachments_size;

alter table public.message_attachments
add constraint message_attachments_size
check (size_bytes between 1 and 524288000);

alter table public.direct_message_attachments
drop constraint if exists direct_message_attachments_size;

alter table public.direct_message_attachments
add constraint direct_message_attachments_size
check (size_bytes between 1 and 524288000);

update storage.buckets
set
  file_size_limit = 524288000,
  allowed_mime_types = array[
    'application/json',
    'application/octet-stream',
    'application/pdf',
    'application/vnd.rar',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
    'application/x-zip-compressed',
    'application/zip',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/markdown',
    'text/plain',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
where id in ('message-attachments', 'direct-message-attachments');

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/gif', 'image/jpeg', 'image/png', 'image/webp']
where id = 'profile-media';

drop policy if exists crypt_profile_media_insert_own on storage.objects;
create policy crypt_profile_media_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (
    lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
    or (
      lower(storage.extension(name)) = 'gif'
      and public.has_active_arcana(auth.uid())
    )
  )
);

drop policy if exists crypt_profile_media_update_own on storage.objects;
create policy crypt_profile_media_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (
    lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
    or (
      lower(storage.extension(name)) = 'gif'
      and public.has_active_arcana(auth.uid())
    )
  )
);

revoke all on function public.get_my_attachment_limit(uuid) from public, anon;
revoke all on function public.get_my_attachment_limit() from public, anon;
grant execute on function public.get_my_attachment_limit(uuid) to authenticated;
grant execute on function public.get_my_attachment_limit() to authenticated;

comment on function public.get_my_attachment_limit(uuid) is
  'Retorna 500 MB para Crypt Pro; fora do Pro, combina o limite pessoal com o benefício do servidor.';

comment on function public.get_my_attachment_limit() is
  'Retorna o limite autenticado para anexos em conversas diretas.';
