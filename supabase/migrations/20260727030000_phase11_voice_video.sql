alter table public.server_channels
drop constraint if exists server_channels_type_phase6;

alter table public.server_channels
add constraint server_channels_type_phase11
check (channel_type in ('text', 'voice', 'video'));

drop function if exists public.get_server_channels(uuid);

create function public.get_server_channels(target_server_id uuid)
returns table (
  channel_id uuid,
  channel_name text,
  normalized_name text,
  category_id uuid,
  channel_icon text,
  topic text,
  channel_type text,
  channel_position integer,
  slowmode_seconds integer,
  is_read_only boolean,
  effective_permissions bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_server_member(target_server_id) then
    raise exception using errcode = '42501', message = 'server_membership_required';
  end if;

  return query
  select
    channels.id,
    channels.name,
    channels.normalized_name,
    channels.category_id,
    channels.icon,
    channels.topic,
    channels.channel_type,
    channels.position,
    channels.slowmode_seconds,
    channels.is_read_only,
    public.get_effective_channel_permissions(channels.id, auth.uid()),
    channels.created_at
  from public.server_channels as channels
  where channels.server_id = target_server_id
    and public.can_view_channel(channels.id, auth.uid())
  order by
    coalesce(
      (
        select categories.position
        from public.server_categories as categories
        where categories.id = channels.category_id
      ),
      -1
    ),
    channels.position,
    channels.created_at;
end;
$$;

create or replace function public.create_server_media_channel(
  target_server_id uuid,
  channel_name text,
  media_channel_type text,
  target_category_id uuid default null,
  channel_icon text default null,
  channel_topic text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_channel_name text := public.normalize_server_name(channel_name);
  normalized_icon text := nullif(btrim(coalesce(channel_icon, '')), '');
  normalized_topic text := nullif(btrim(coalesce(channel_topic, '')), '');
  next_position integer;
  created_channel_id uuid;
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 4)
  ) then
    raise exception using errcode = '42501', message = 'server_channel_management_required';
  end if;

  if media_channel_type not in ('voice', 'video') then
    raise exception using errcode = '22023', message = 'invalid_media_channel_type';
  end if;

  if char_length(normalized_channel_name) not between 1 and 80
    or normalized_channel_name ~ '[[:cntrl:]]'
  then
    raise exception using errcode = '22023', message = 'invalid_channel_name';
  end if;

  if normalized_icon is not null and char_length(normalized_icon) > 16 then
    raise exception using errcode = '22023', message = 'invalid_channel_icon';
  end if;

  if normalized_topic is not null and char_length(normalized_topic) > 1024 then
    raise exception using errcode = '22023', message = 'invalid_channel_topic';
  end if;

  if target_category_id is not null and not exists (
    select 1
    from public.server_categories
    where server_categories.id = target_category_id
      and server_categories.server_id = target_server_id
  ) then
    raise exception using errcode = '22023', message = 'category_server_mismatch';
  end if;

  select coalesce(max(channels.position), -1) + 1
  into next_position
  from public.server_channels as channels
  where channels.server_id = target_server_id
    and channels.category_id is not distinct from target_category_id;

  insert into public.server_channels (
    server_id,
    name,
    normalized_name,
    channel_type,
    category_id,
    icon,
    topic,
    position,
    slowmode_seconds,
    is_read_only,
    created_by
  )
  values (
    target_server_id,
    normalized_channel_name,
    lower(normalized_channel_name),
    media_channel_type,
    target_category_id,
    normalized_icon,
    normalized_topic,
    next_position,
    0,
    false,
    auth.uid()
  )
  returning id into created_channel_id;

  return created_channel_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'channel_name_unavailable';
end;
$$;

create or replace function public.get_voice_channel_access(target_channel_id uuid)
returns table (
  channel_id uuid,
  channel_name text,
  channel_type text,
  server_id uuid,
  server_name text,
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  can_publish boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  channel_record public.server_channels%rowtype;
begin
  select * into channel_record
  from public.server_channels
  where id = target_channel_id;

  if channel_record.id is null
    or channel_record.channel_type not in ('voice', 'video')
    or not public.can_view_channel(target_channel_id, auth.uid())
  then
    raise exception using errcode = '42501', message = 'voice_channel_access_denied';
  end if;

  return query
  select
    channel_record.id,
    channel_record.name,
    channel_record.channel_type,
    servers.id,
    servers.name,
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    (
      public.is_server_owner(channel_record.server_id)
      or (
        public.get_effective_channel_permissions(target_channel_id, auth.uid())
          & 256::bigint
      ) = 256::bigint
    )
  from public.servers
  join public.profiles on profiles.id = auth.uid()
  where servers.id = channel_record.server_id;
end;
$$;

create or replace function public.ensure_text_channel_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.server_channels
    where server_channels.id = new.channel_id
      and server_channels.channel_type = 'text'
  ) then
    raise exception using errcode = '42501', message = 'text_channel_required';
  end if;
  return new;
end;
$$;

create trigger channel_messages_require_text_channel
before insert on public.channel_messages
for each row execute function public.ensure_text_channel_message();

revoke all on function public.get_server_channels(uuid) from public;
revoke all on function public.create_server_media_channel(uuid, text, text, uuid, text, text)
from public;
revoke all on function public.get_voice_channel_access(uuid) from public;
revoke all on function public.ensure_text_channel_message() from public;

grant execute on function public.get_server_channels(uuid) to authenticated;
grant execute on function public.create_server_media_channel(uuid, text, text, uuid, text, text)
to authenticated;
grant execute on function public.get_voice_channel_access(uuid) to authenticated;
