set lock_timeout = '5s';
set statement_timeout = '60s';

alter table public.direct_conversations
add column title text,
add column avatar_path text,
add column updated_at timestamptz not null default clock_timestamp();

alter table public.direct_conversation_participants
add column participant_role text not null default 'member';

alter table public.direct_conversations
add constraint direct_conversations_group_title
check (
  (conversation_type = 'direct' and title is null and avatar_path is null)
  or (
    conversation_type = 'group'
    and char_length(btrim(title)) between 2 and 60
    and (avatar_path is null or char_length(avatar_path) between 1 and 320)
  )
);

alter table public.direct_conversation_participants
add constraint direct_participants_role
check (participant_role in ('member', 'owner'));

create unique index direct_group_single_owner_idx
on public.direct_conversation_participants (conversation_id)
where participant_role = 'owner';

create or replace function public.cleanup_direct_conversation_after_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_kind text;
  next_owner_id uuid;
begin
  select conversation_type into conversation_kind
  from public.direct_conversations where id = old.conversation_id;

  if conversation_kind = 'direct' and (
    select count(*) from public.direct_conversation_participants
    where conversation_id = old.conversation_id
  ) < 2 then
    delete from public.direct_conversations where id = old.conversation_id;
  elsif conversation_kind = 'group' and old.participant_role = 'owner' then
    select profile_id into next_owner_id
    from public.direct_conversation_participants
    where conversation_id = old.conversation_id
    order by joined_at, profile_id
    limit 1;

    if next_owner_id is null then
      delete from public.direct_conversations where id = old.conversation_id;
    else
      update public.direct_conversation_participants
      set participant_role = 'owner'
      where conversation_id = old.conversation_id and profile_id = next_owner_id;

      update public.direct_conversations
      set created_by = next_owner_id
      where id = old.conversation_id;
    end if;
  end if;

  return null;
end;
$$;

create trigger direct_conversations_set_updated_at
before update on public.direct_conversations
for each row execute function public.set_profile_updated_at();

create or replace function public.is_direct_group_owner(
  target_conversation_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_profile_id is not null
    and exists (
      select 1
      from public.direct_conversations as conversations
      inner join public.direct_conversation_participants as participants
        on participants.conversation_id = conversations.id
      where conversations.id = target_conversation_id
        and conversations.conversation_type = 'group'
        and participants.profile_id = target_profile_id
        and participants.participant_role = 'owner'
    );
$$;

create or replace function public.create_direct_group(
  group_title text,
  member_profile_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_title text := btrim(coalesce(group_title, ''));
  normalized_members uuid[];
  member_id uuid;
  conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if char_length(normalized_title) not between 2 and 60 then
    raise exception using errcode = '22023', message = 'invalid_group_title';
  end if;

  select coalesce(array_agg(distinct selected_id), '{}'::uuid[])
  into normalized_members
  from unnest(coalesce(member_profile_ids, '{}'::uuid[])) as selected(selected_id)
  where selected_id is not null and selected_id <> auth.uid();

  if cardinality(normalized_members) not between 2 and 9 then
    raise exception using errcode = '22023', message = 'invalid_group_member_count';
  end if;

  foreach member_id in array normalized_members loop
    if not exists (select 1 from public.profiles where id = member_id) then
      raise exception using errcode = 'P0002', message = 'profile_not_found';
    end if;

    if not public.are_friends(member_id) or public.has_block_between(member_id) then
      raise exception using errcode = '42501', message = 'group_member_not_allowed';
    end if;
  end loop;

  insert into public.direct_conversations (
    conversation_type,
    created_by,
    title
  )
  values ('group', auth.uid(), normalized_title)
  returning id into conversation_id;

  insert into public.direct_conversation_participants (
    conversation_id,
    profile_id,
    participant_role
  )
  values (conversation_id, auth.uid(), 'owner');

  insert into public.direct_conversation_participants (
    conversation_id,
    profile_id,
    participant_role
  )
  select conversation_id, selected_id, 'member'
  from unnest(normalized_members) as selected(selected_id);

  foreach member_id in array normalized_members loop
    perform public.create_user_notification(
      member_id,
      auth.uid(),
      'direct_message',
      'Você entrou em ' || normalized_title,
      'Um amigo adicionou você a um grupo privado.',
      '/app/mensagens/' || conversation_id::text,
      conversation_id,
      'direct-group-added:' || conversation_id::text || ':' || member_id::text
    );
  end loop;

  return conversation_id;
end;
$$;

drop function public.get_my_direct_conversations();

create function public.get_my_direct_conversations()
returns table (
  conversation_id uuid,
  conversation_type text,
  conversation_title text,
  conversation_avatar_path text,
  member_count bigint,
  is_owner boolean,
  other_profile_id uuid,
  other_display_name text,
  other_handle text,
  other_avatar_path text,
  is_online boolean,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_author_id uuid,
  unread_count bigint,
  is_blocked boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  return query
  select
    conversations.id,
    conversations.conversation_type,
    case
      when conversations.conversation_type = 'group' then conversations.title
      else other_profile.display_name
    end,
    case
      when conversations.conversation_type = 'group' then conversations.avatar_path
      else other_profile.avatar_path
    end,
    participant_totals.member_count,
    mine.participant_role = 'owner',
    other_profile.id,
    other_profile.display_name,
    other_profile.handle,
    other_profile.avatar_path,
    case
      when conversations.conversation_type = 'direct' then coalesce(
        public.can_view_presence(other_profile.id)
        and other_presence.last_seen_at > now() - interval '90 seconds'
        and other_presence.status <> 'invisible',
        false
      )
      else exists (
        select 1
        from public.direct_conversation_participants as group_participants
        inner join public.user_presence as group_presence
          on group_presence.profile_id = group_participants.profile_id
        where group_participants.conversation_id = conversations.id
          and group_participants.profile_id <> auth.uid()
          and public.can_view_presence(group_participants.profile_id)
          and group_presence.last_seen_at > now() - interval '90 seconds'
          and group_presence.status <> 'invisible'
      )
    end,
    conversations.last_message_at,
    case
      when last_message.deleted_at is not null then 'Mensagem excluída'
      when last_message.content is not null then left(last_message.content, 120)
      when last_message.id is not null then 'Anexo'
      else case
        when conversations.conversation_type = 'group' then 'Grupo criado'
        else 'Conversa iniciada'
      end
    end,
    last_message.author_id,
    (
      select count(*)
      from public.direct_messages as unread_messages
      where unread_messages.conversation_id = conversations.id
        and unread_messages.created_at > mine.last_read_at
        and unread_messages.author_id is distinct from auth.uid()
    ),
    exists (
      select 1
      from public.direct_conversation_participants as blocked_participants
      inner join public.user_blocks as blocks
        on (
          blocks.blocker_id = auth.uid()
          and blocks.blocked_id = blocked_participants.profile_id
        )
        or (
          blocks.blocked_id = auth.uid()
          and blocks.blocker_id = blocked_participants.profile_id
        )
      where blocked_participants.conversation_id = conversations.id
        and blocked_participants.profile_id <> auth.uid()
    )
  from public.direct_conversation_participants as mine
  inner join public.direct_conversations as conversations
    on conversations.id = mine.conversation_id
  left join lateral (
    select participants.profile_id
    from public.direct_conversation_participants as participants
    where participants.conversation_id = conversations.id
      and participants.profile_id <> auth.uid()
      and conversations.conversation_type = 'direct'
    limit 1
  ) as other_participant on true
  left join public.profiles as other_profile
    on other_profile.id = other_participant.profile_id
  left join public.user_presence as other_presence
    on other_presence.profile_id = other_profile.id
  cross join lateral (
    select count(*) as member_count
    from public.direct_conversation_participants as participants
    where participants.conversation_id = conversations.id
  ) as participant_totals
  left join lateral (
    select messages.*
    from public.direct_messages as messages
    where messages.conversation_id = conversations.id
    order by messages.created_at desc, messages.id desc
    limit 1
  ) as last_message on true
  where mine.profile_id = auth.uid()
    and mine.hidden_at is null
  order by conversations.last_message_at desc, conversations.id;
end;
$$;

create or replace function public.get_direct_group_members(target_conversation_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  participant_role text,
  joined_at timestamptz,
  is_online boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_direct_conversation_participant(target_conversation_id)
    or not exists (
      select 1 from public.direct_conversations
      where id = target_conversation_id and conversation_type = 'group'
    )
  then
    raise exception using errcode = '42501', message = 'direct_group_access_required';
  end if;

  return query
  select
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    participants.participant_role,
    participants.joined_at,
    coalesce(
      public.can_view_presence(profiles.id)
      and presence.last_seen_at > now() - interval '90 seconds'
      and presence.status <> 'invisible',
      false
    )
  from public.direct_conversation_participants as participants
  inner join public.profiles on profiles.id = participants.profile_id
  left join public.user_presence as presence on presence.profile_id = profiles.id
  where participants.conversation_id = target_conversation_id
  order by participants.participant_role = 'owner' desc, participants.joined_at, profiles.handle;
end;
$$;

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
    '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
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

create or replace function public.add_direct_group_member(
  target_conversation_id uuid,
  target_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_title text;
begin
  if not public.is_direct_group_owner(target_conversation_id) then
    raise exception using errcode = '42501', message = 'direct_group_owner_required';
  end if;

  if target_profile_id is null
    or target_profile_id = auth.uid()
    or not public.are_friends(target_profile_id)
    or public.has_block_between(target_profile_id)
  then
    raise exception using errcode = '42501', message = 'group_member_not_allowed';
  end if;

  perform 1
  from public.direct_conversations
  where id = target_conversation_id and conversation_type = 'group'
  for update;

  if (
    select count(*) from public.direct_conversation_participants
    where conversation_id = target_conversation_id
  ) >= 10 then
    raise exception using errcode = '22023', message = 'direct_group_full';
  end if;

  insert into public.direct_conversation_participants (
    conversation_id,
    profile_id,
    participant_role,
    hidden_at,
    joined_at,
    last_read_at
  )
  values (
    target_conversation_id,
    target_profile_id,
    'member',
    null,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (conversation_id, profile_id) do update
  set hidden_at = null,
      joined_at = clock_timestamp(),
      last_read_at = clock_timestamp(),
      participant_role = 'member';

  select title into group_title
  from public.direct_conversations
  where id = target_conversation_id;

  perform public.create_user_notification(
    target_profile_id,
    auth.uid(),
    'direct_message',
    'Você entrou em ' || group_title,
    'Um amigo adicionou você a um grupo privado.',
    '/app/mensagens/' || target_conversation_id::text,
    target_conversation_id,
    'direct-group-added:' || target_conversation_id::text || ':' || target_profile_id::text
  );
end;
$$;

create or replace function public.remove_direct_group_member(
  target_conversation_id uuid,
  target_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_direct_group_owner(target_conversation_id) then
    raise exception using errcode = '42501', message = 'direct_group_owner_required';
  end if;

  if target_profile_id = auth.uid() then
    raise exception using errcode = '22023', message = 'cannot_remove_group_owner';
  end if;

  delete from public.direct_conversation_participants
  where conversation_id = target_conversation_id
    and profile_id = target_profile_id
    and participant_role = 'member';

  if not found then
    raise exception using errcode = 'P0002', message = 'group_member_not_found';
  end if;
end;
$$;

create or replace function public.transfer_direct_group_ownership(
  target_conversation_id uuid,
  target_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_direct_group_owner(target_conversation_id) then
    raise exception using errcode = '42501', message = 'direct_group_owner_required';
  end if;

  if target_profile_id = auth.uid() or not exists (
    select 1 from public.direct_conversation_participants
    where conversation_id = target_conversation_id
      and profile_id = target_profile_id
      and participant_role = 'member'
  ) then
    raise exception using errcode = '22023', message = 'invalid_group_owner';
  end if;

  update public.direct_conversation_participants
  set participant_role = 'member'
  where conversation_id = target_conversation_id and profile_id = auth.uid();

  update public.direct_conversation_participants
  set participant_role = 'owner'
  where conversation_id = target_conversation_id and profile_id = target_profile_id;

  update public.direct_conversations
  set created_by = target_profile_id
  where id = target_conversation_id;
end;
$$;

create or replace function public.leave_direct_group(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_direct_group_owner(target_conversation_id) then
    raise exception using errcode = '42501', message = 'transfer_group_before_leaving';
  end if;

  delete from public.direct_conversation_participants
  where conversation_id = target_conversation_id
    and profile_id = auth.uid()
    and exists (
      select 1 from public.direct_conversations
      where id = target_conversation_id and conversation_type = 'group'
    );

  if not found then
    raise exception using errcode = 'P0002', message = 'direct_group_not_found';
  end if;
end;
$$;

create or replace function public.delete_direct_group(target_conversation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_avatar_path text;
begin
  if not public.is_direct_group_owner(target_conversation_id) then
    raise exception using errcode = '42501', message = 'direct_group_owner_required';
  end if;

  delete from public.direct_conversations
  where id = target_conversation_id and conversation_type = 'group'
  returning avatar_path into removed_avatar_path;

  return removed_avatar_path;
end;
$$;

create or replace function public.can_manage_direct_group_media(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  conversation_id uuid;
begin
  if auth.uid() is null or object_name is null or object_name !~
    '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  then
    return false;
  end if;

  path_parts := string_to_array(object_name, '/');
  conversation_id := path_parts[1]::uuid;
  return public.is_direct_group_owner(conversation_id);
exception when invalid_text_representation then
  return false;
end;
$$;

create or replace function public.can_view_direct_group_media(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
begin
  if auth.uid() is null or object_name is null then return false; end if;
  path_parts := string_to_array(object_name, '/');
  return cardinality(path_parts) = 3
    and public.is_direct_conversation_participant(path_parts[1]::uuid);
exception when invalid_text_representation then
  return false;
end;
$$;

create or replace function public.get_direct_voice_access(target_conversation_id uuid)
returns table (
  conversation_id uuid,
  conversation_name text,
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
begin
  if not public.is_direct_conversation_participant(target_conversation_id) then
    raise exception using errcode = '42501', message = 'direct_voice_access_denied';
  end if;

  return query
  select
    conversations.id,
    case
      when conversations.conversation_type = 'group' then conversations.title
      else other_profile.display_name
    end,
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    true
  from public.direct_conversations as conversations
  inner join public.profiles on profiles.id = auth.uid()
  left join lateral (
    select other_profiles.*
    from public.direct_conversation_participants as participants
    inner join public.profiles as other_profiles on other_profiles.id = participants.profile_id
    where participants.conversation_id = conversations.id
      and participants.profile_id <> auth.uid()
      and conversations.conversation_type = 'direct'
    limit 1
  ) as other_profile on true
  where conversations.id = target_conversation_id
    and not exists (
      select 1
      from public.direct_conversation_participants as blocked_participants
      inner join public.user_blocks as blocks
        on (
          blocks.blocker_id = auth.uid()
          and blocks.blocked_id = blocked_participants.profile_id
        )
        or (
          blocks.blocked_id = auth.uid()
          and blocks.blocker_id = blocked_participants.profile_id
        )
      where blocked_participants.conversation_id = conversations.id
        and blocked_participants.profile_id <> auth.uid()
    );
end;
$$;

create or replace function public.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_record record;
  actor_name text;
  conversation_kind text;
  conversation_title text;
begin
  if new.author_id is null then return new; end if;

  select profiles.display_name into actor_name
  from public.profiles where profiles.id = new.author_id;

  select conversation_type, title
  into conversation_kind, conversation_title
  from public.direct_conversations where id = new.conversation_id;

  for recipient_record in
    select participants.profile_id
    from public.direct_conversation_participants as participants
    where participants.conversation_id = new.conversation_id
      and participants.profile_id <> new.author_id
  loop
    perform public.create_user_notification(
      recipient_record.profile_id,
      new.author_id,
      'direct_message',
      case
        when conversation_kind = 'group' then 'Nova mensagem em ' || conversation_title
        else 'Nova mensagem de ' || coalesce(actor_name, 'uma pessoa')
      end,
      coalesce(nullif(left(new.content, 180), ''), 'Enviou um anexo'),
      '/app/mensagens/' || new.conversation_id::text,
      new.id,
      'direct-message:' || new.id::text || ':' || recipient_record.profile_id::text
    );
  end loop;

  return new;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'direct-group-media',
  'direct-group-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy crypt_direct_group_media_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'direct-group-media'
  and public.can_manage_direct_group_media(name)
  and split_part(name, '/', 2) = auth.uid()::text
);

create policy crypt_direct_group_media_select
on storage.objects for select to authenticated
using (
  bucket_id = 'direct-group-media'
  and public.can_view_direct_group_media(name)
);

create policy crypt_direct_group_media_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'direct-group-media'
  and public.can_manage_direct_group_media(name)
);

revoke all on function public.is_direct_group_owner(uuid, uuid) from public;
revoke all on function public.create_direct_group(text, uuid[]) from public;
revoke all on function public.get_my_direct_conversations() from public;
revoke all on function public.get_direct_group_members(uuid) from public;
revoke all on function public.update_direct_group(uuid, text, text) from public;
revoke all on function public.add_direct_group_member(uuid, uuid) from public;
revoke all on function public.remove_direct_group_member(uuid, uuid) from public;
revoke all on function public.transfer_direct_group_ownership(uuid, uuid) from public;
revoke all on function public.leave_direct_group(uuid) from public;
revoke all on function public.delete_direct_group(uuid) from public;
revoke all on function public.can_manage_direct_group_media(text) from public;
revoke all on function public.can_view_direct_group_media(text) from public;
revoke all on function public.get_direct_voice_access(uuid) from public;

grant execute on function public.create_direct_group(text, uuid[]) to authenticated;
grant execute on function public.get_my_direct_conversations() to authenticated;
grant execute on function public.get_direct_group_members(uuid) to authenticated;
grant execute on function public.update_direct_group(uuid, text, text) to authenticated;
grant execute on function public.add_direct_group_member(uuid, uuid) to authenticated;
grant execute on function public.remove_direct_group_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_direct_group_ownership(uuid, uuid) to authenticated;
grant execute on function public.leave_direct_group(uuid) to authenticated;
grant execute on function public.delete_direct_group(uuid) to authenticated;
grant execute on function public.can_manage_direct_group_media(text) to authenticated;
grant execute on function public.can_view_direct_group_media(text) to authenticated;
grant execute on function public.get_direct_voice_access(uuid) to authenticated;

comment on function public.create_direct_group(text, uuid[]) is
  'Cria um grupo privado com o proprietário e de dois a nove amigos.';
comment on function public.get_direct_voice_access(uuid) is
  'Autoriza chamadas LiveKit somente para participantes da conversa privada.';
