set lock_timeout = '5s';
set statement_timeout = '30s';

create or replace function public.can_manage_server_media(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_server_id uuid;
begin
  if auth.uid() is null
    or object_name is null
    or object_name !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(icon|banner)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  then
    return false;
  end if;

  target_server_id := split_part(object_name, '/', 1)::uuid;

  return exists (
    select 1
    from public.servers
    where servers.id = target_server_id
      and servers.owner_id = auth.uid()
  );
exception
  when invalid_text_representation then
    return false;
end;
$$;

revoke all on function public.can_manage_server_media(text) from public;
grant execute on function public.can_manage_server_media(text) to authenticated;

drop policy if exists crypt_server_media_insert_owner on storage.objects;
drop policy if exists crypt_server_media_delete_owner on storage.objects;

create policy crypt_server_media_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'server-media'
  and public.can_manage_server_media(name)
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
);

create policy crypt_server_media_delete_owner
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'server-media'
  and public.can_manage_server_media(name)
);

comment on function public.can_manage_server_media(text) is
  'Valida formato e propriedade do servidor sem depender da RLS recursiva durante operações no Storage.';
