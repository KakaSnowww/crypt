set lock_timeout = '5s';
set statement_timeout = '60s';

alter table public.profiles
drop constraint if exists profiles_avatar_path_own_folder,
drop constraint if exists profiles_banner_path_own_folder,
drop constraint if exists profiles_profile_effect_valid;

alter table public.profiles
add constraint profiles_avatar_path_own_folder
check (
  avatar_path is null
  or (
    split_part(avatar_path, '/', 1) = id::text
    and avatar_path ~ '^[0-9a-f-]{36}/avatar-[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$'
  )
),
add constraint profiles_banner_path_own_folder
check (
  banner_path is null
  or (
    split_part(banner_path, '/', 1) = id::text
    and banner_path ~ '^[0-9a-f-]{36}/banner-[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$'
  )
),
add constraint profiles_profile_effect_valid
check (profile_effect in ('none', 'aurora', 'neon', 'pulse', 'ocean', 'sunset', 'emerald'));

alter table public.servers
drop constraint if exists servers_icon_path,
drop constraint if exists servers_banner_path;

alter table public.servers
add constraint servers_icon_path
check (
  icon_path is null
  or (
    split_part(icon_path, '/', 1) = id::text
    and icon_path ~ '^[0-9a-f-]{36}/icon-[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$'
  )
),
add constraint servers_banner_path
check (
  banner_path is null
  or (
    split_part(banner_path, '/', 1) = id::text
    and banner_path ~ '^[0-9a-f-]{36}/banner-[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$'
  )
);

update storage.buckets
set allowed_mime_types = array['image/gif', 'image/jpeg', 'image/png', 'image/webp']
where id in ('profile-media', 'server-media', 'direct-group-media');

create or replace function public.update_direct_group(
  target_conversation_id uuid,
  group_title text,
  group_avatar_path text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_title text := btrim(coalesce(group_title, ''));
  previous_avatar_path text;
begin
  if not public.is_direct_group_owner(target_conversation_id) then
    raise exception using errcode = '42501', message = 'direct_group_owner_required';
  end if;

  if char_length(normalized_title) not between 2 and 60 then
    raise exception using errcode = '22023', message = 'invalid_group_title';
  end if;

  if group_avatar_path is not null and group_avatar_path !~ (
    '^' || target_conversation_id::text || '/[0-9a-f-]{36}' ||
    '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$'
  ) then
    raise exception using errcode = '22023', message = 'invalid_group_avatar_path';
  end if;

  select avatar_path into previous_avatar_path
  from public.direct_conversations
  where id = target_conversation_id;

  update public.direct_conversations
  set title = normalized_title,
      avatar_path = group_avatar_path
  where id = target_conversation_id;

  return previous_avatar_path;
end;
$$;

comment on constraint profiles_profile_effect_valid on public.profiles is
  'Temas visuais oficiais do Crypt para perfil e chamadas.';
