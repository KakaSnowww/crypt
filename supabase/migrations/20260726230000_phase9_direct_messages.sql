set lock_timeout = '5s';
set statement_timeout = '60s';

alter table public.profile_settings
add column direct_message_policy text not null default 'friends',
add constraint profile_settings_direct_message_policy
  check (direct_message_policy in ('anyone', 'friends', 'shared_servers', 'none'));

update public.profile_settings
set direct_message_policy = case
  when allow_direct_messages then 'friends'
  else 'none'
end;

grant update (direct_message_policy) on public.profile_settings to authenticated;

create table public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'direct',
  direct_key text unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  last_message_at timestamptz not null default clock_timestamp(),
  constraint direct_conversations_type
    check (conversation_type in ('direct', 'group')),
  constraint direct_conversations_direct_key
    check (
      (conversation_type = 'direct' and direct_key is not null)
      or (conversation_type = 'group' and direct_key is null)
    )
);

create index direct_conversations_recent_idx
on public.direct_conversations (last_message_at desc, id);

create table public.direct_conversation_participants (
  conversation_id uuid not null
    references public.direct_conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default clock_timestamp(),
  hidden_at timestamptz,
  last_read_at timestamptz not null default clock_timestamp(),
  primary key (conversation_id, profile_id)
);

create index direct_participants_profile_idx
on public.direct_conversation_participants (
  profile_id,
  hidden_at,
  last_read_at
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.direct_conversations (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  reply_to_id uuid references public.direct_messages (id) on delete set null,
  content text,
  created_at timestamptz not null default clock_timestamp(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  constraint direct_messages_content_length
    check (content is null or char_length(content) between 1 and 2000),
  constraint direct_messages_deleted_content
    check (
      deleted_at is null
      or (deleted_at is not null and content is null)
    )
);

create index direct_messages_page_idx
on public.direct_messages (conversation_id, created_at desc, id desc);

create table public.direct_message_reactions (
  message_id uuid not null references public.direct_messages (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (message_id, profile_id, emoji),
  constraint direct_message_reactions_emoji
    check (char_length(emoji) between 1 and 16 and emoji !~ '[[:cntrl:]]')
);

create table public.direct_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.direct_messages (id) on delete cascade,
  uploader_id uuid references public.profiles (id) on delete set null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint direct_message_attachments_name
    check (char_length(original_name) between 1 and 160),
  constraint direct_message_attachments_mime
    check (
      mime_type in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/plain'
      )
    ),
  constraint direct_message_attachments_size
    check (size_bytes between 1 and 5242880)
);

create index direct_message_attachments_message_idx
on public.direct_message_attachments (message_id);

create or replace function public.cleanup_direct_conversation_after_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.direct_conversations as conversations
    where conversations.id = old.conversation_id
      and conversations.conversation_type = 'direct'
  ) and (
    select count(*)
    from public.direct_conversation_participants as participants
    where participants.conversation_id = old.conversation_id
  ) < 2 then
    delete from public.direct_conversations
    where direct_conversations.id = old.conversation_id;
  end if;

  return null;
end;
$$;

create trigger direct_participants_cleanup_conversation
after delete on public.direct_conversation_participants
for each row
execute function public.cleanup_direct_conversation_after_participant();

alter table public.direct_conversations replica identity full;
alter table public.direct_conversation_participants replica identity full;
alter table public.direct_messages replica identity full;
alter table public.direct_message_reactions replica identity full;

create or replace function public.direct_conversation_key(
  first_profile_id uuid,
  second_profile_id uuid
)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select
    least(first_profile_id::text, second_profile_id::text)
    || ':'
    || greatest(first_profile_id::text, second_profile_id::text);
$$;

create or replace function public.is_direct_conversation_participant(
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
      from public.direct_conversation_participants as participants
      where participants.conversation_id = target_conversation_id
        and participants.profile_id = target_profile_id
    );
$$;

create or replace function public.have_shared_server(
  first_profile_id uuid,
  second_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.server_members as first_membership
    inner join public.server_members as second_membership
      on second_membership.server_id = first_membership.server_id
    where first_membership.profile_id = first_profile_id
      and second_membership.profile_id = second_profile_id
  );
$$;

create or replace function public.can_start_direct_message(target_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  policy_value text;
begin
  if auth.uid() is null
    or target_profile_id is null
    or auth.uid() = target_profile_id
    or public.has_block_between(target_profile_id)
  then
    return false;
  end if;

  select settings.direct_message_policy
  into policy_value
  from public.profile_settings as settings
  where settings.profile_id = target_profile_id;

  return case policy_value
    when 'anyone' then true
    when 'friends' then public.are_friends(target_profile_id)
    when 'shared_servers' then
      public.are_friends(target_profile_id)
      or public.have_shared_server(auth.uid(), target_profile_id)
    else false
  end;
end;
$$;

create or replace function public.can_send_direct_message(
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
    public.is_direct_conversation_participant(
      target_conversation_id,
      target_profile_id
    )
    and not exists (
      select 1
      from public.direct_conversation_participants as other_participants
      inner join public.user_blocks as blocks
        on (
          blocks.blocker_id = target_profile_id
          and blocks.blocked_id = other_participants.profile_id
        )
        or (
          blocks.blocked_id = target_profile_id
          and blocks.blocker_id = other_participants.profile_id
        )
      where other_participants.conversation_id = target_conversation_id
        and other_participants.profile_id <> target_profile_id
    );
$$;

create or replace function public.open_direct_conversation(target_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_key text;
  conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if target_profile_id is null or target_profile_id = auth.uid() then
    raise exception using errcode = '22023', message = 'invalid_direct_recipient';
  end if;

  conversation_key := public.direct_conversation_key(
    auth.uid(),
    target_profile_id
  );

  select conversations.id
  into conversation_id
  from public.direct_conversations as conversations
  where conversations.direct_key = conversation_key;

  if found then
    if not public.is_direct_conversation_participant(conversation_id) then
      raise exception using errcode = '42501', message = 'direct_access_required';
    end if;

    update public.direct_conversation_participants
    set hidden_at = null
    where direct_conversation_participants.conversation_id = conversation_id
      and direct_conversation_participants.profile_id = auth.uid();

    return conversation_id;
  end if;

  if not public.can_start_direct_message(target_profile_id) then
    raise exception using errcode = '42501', message = 'direct_message_not_allowed';
  end if;

  if not exists (
    select 1 from public.profiles where profiles.id = target_profile_id
  ) then
    raise exception using errcode = 'P0002', message = 'profile_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(conversation_key, 90));

  select conversations.id
  into conversation_id
  from public.direct_conversations as conversations
  where conversations.direct_key = conversation_key;

  if not found then
    insert into public.direct_conversations (
      conversation_type,
      direct_key,
      created_by
    )
    values ('direct', conversation_key, auth.uid())
    returning id into conversation_id;

    insert into public.direct_conversation_participants (
      conversation_id,
      profile_id
    )
    values
      (conversation_id, auth.uid()),
      (conversation_id, target_profile_id);
  end if;

  return conversation_id;
end;
$$;

create or replace function public.hide_direct_conversation(
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.direct_conversation_participants
  set hidden_at = clock_timestamp()
  where direct_conversation_participants.conversation_id = target_conversation_id
    and direct_conversation_participants.profile_id = auth.uid();

  if not found then
    raise exception using errcode = '42501', message = 'direct_access_required';
  end if;
end;
$$;

create or replace function public.get_my_direct_conversations()
returns table (
  conversation_id uuid,
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
    other_profile.id,
    other_profile.display_name,
    other_profile.handle,
    other_profile.avatar_path,
    coalesce(
      public.can_view_presence(other_profile.id)
      and presence.last_seen_at > now() - interval '90 seconds'
      and presence.status <> 'invisible',
      false
    ),
    conversations.last_message_at,
    case
      when last_message.deleted_at is not null then 'Mensagem excluída'
      when last_message.content is not null then left(last_message.content, 120)
      when last_message.id is not null then 'Anexo'
      else 'Conversa iniciada'
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
      from public.user_blocks as blocks
      where (
        blocks.blocker_id = auth.uid()
        and blocks.blocked_id = other_profile.id
      )
      or (
        blocks.blocked_id = auth.uid()
        and blocks.blocker_id = other_profile.id
      )
    )
  from public.direct_conversation_participants as mine
  inner join public.direct_conversations as conversations
    on conversations.id = mine.conversation_id
  inner join public.direct_conversation_participants as other_participant
    on other_participant.conversation_id = conversations.id
    and other_participant.profile_id <> auth.uid()
  inner join public.profiles as other_profile
    on other_profile.id = other_participant.profile_id
  left join public.user_presence as presence
    on presence.profile_id = other_profile.id
  left join lateral (
    select messages.*
    from public.direct_messages as messages
    where messages.conversation_id = conversations.id
    order by messages.created_at desc, messages.id desc
    limit 1
  ) as last_message on true
  where mine.profile_id = auth.uid()
    and mine.hidden_at is null
    and conversations.conversation_type = 'direct'
  order by conversations.last_message_at desc, conversations.id;
end;
$$;

create or replace function public.can_upload_direct_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  conversation_id uuid;
  uploader_id uuid;
begin
  if auth.uid() is null
    or object_name is null
    or object_name !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif|pdf|txt)$'
  then
    return false;
  end if;

  path_parts := string_to_array(object_name, '/');
  conversation_id := path_parts[1]::uuid;
  uploader_id := path_parts[2]::uuid;

  return uploader_id = auth.uid()
    and public.can_send_direct_message(conversation_id);
exception
  when invalid_text_representation then
    return false;
end;
$$;

create or replace function public.can_view_direct_attachment(object_name text)
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
  if auth.uid() is null or object_name is null then
    return false;
  end if;

  path_parts := string_to_array(object_name, '/');

  if cardinality(path_parts) <> 3 then
    return false;
  end if;

  conversation_id := path_parts[1]::uuid;
  return public.is_direct_conversation_participant(conversation_id);
exception
  when invalid_text_representation then
    return false;
end;
$$;

create or replace function public.can_delete_direct_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  uploader_id uuid;
begin
  if not public.can_view_direct_attachment(object_name) then
    return false;
  end if;

  path_parts := string_to_array(object_name, '/');
  uploader_id := path_parts[2]::uuid;
  return uploader_id = auth.uid();
exception
  when invalid_text_representation then
    return false;
end;
$$;

create or replace function public.send_direct_message(
  target_conversation_id uuid,
  message_content text,
  target_reply_id uuid default null,
  attachment_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_content text := btrim(coalesce(message_content, ''));
  created_message_id uuid;
  attachment_item jsonb;
  attachment_count integer;
begin
  if not public.can_send_direct_message(target_conversation_id) then
    raise exception using errcode = '42501', message = 'direct_message_blocked';
  end if;

  if char_length(normalized_content) > 2000
    or jsonb_typeof(coalesce(attachment_items, '[]'::jsonb)) <> 'array'
  then
    raise exception using errcode = '22023', message = 'invalid_direct_message';
  end if;

  attachment_count := jsonb_array_length(coalesce(attachment_items, '[]'::jsonb));

  if attachment_count > 3 or (normalized_content = '' and attachment_count = 0) then
    raise exception using errcode = '22023', message = 'invalid_message_payload';
  end if;

  if target_reply_id is not null
    and not exists (
      select 1
      from public.direct_messages as replies
      where replies.id = target_reply_id
        and replies.conversation_id = target_conversation_id
    )
  then
    raise exception using errcode = '22023', message = 'reply_conversation_mismatch';
  end if;

  insert into public.direct_messages (
    conversation_id,
    author_id,
    content,
    reply_to_id
  )
  values (
    target_conversation_id,
    auth.uid(),
    nullif(normalized_content, ''),
    target_reply_id
  )
  returning id into created_message_id;

  for attachment_item in
    select value
    from jsonb_array_elements(coalesce(attachment_items, '[]'::jsonb))
  loop
    if not public.can_upload_direct_attachment(attachment_item ->> 'storage_path')
      or attachment_item ->> 'mime_type' not in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/plain'
      )
      or coalesce((attachment_item ->> 'size_bytes')::integer, 0)
        not between 1 and 5242880
      or char_length(coalesce(attachment_item ->> 'original_name', ''))
        not between 1 and 160
    then
      raise exception using errcode = '22023', message = 'invalid_message_attachment';
    end if;

    insert into public.direct_message_attachments (
      message_id,
      uploader_id,
      storage_path,
      original_name,
      mime_type,
      size_bytes
    )
    values (
      created_message_id,
      auth.uid(),
      attachment_item ->> 'storage_path',
      attachment_item ->> 'original_name',
      attachment_item ->> 'mime_type',
      (attachment_item ->> 'size_bytes')::integer
    );
  end loop;

  update public.direct_conversations
  set last_message_at = clock_timestamp()
  where direct_conversations.id = target_conversation_id;

  update public.direct_conversation_participants
  set hidden_at = null
  where direct_conversation_participants.conversation_id = target_conversation_id;

  update public.direct_conversation_participants
  set last_read_at = clock_timestamp()
  where direct_conversation_participants.conversation_id = target_conversation_id
    and direct_conversation_participants.profile_id = auth.uid();

  return created_message_id;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'invalid_message_attachment';
end;
$$;

create or replace function public.get_direct_messages(
  target_conversation_id uuid,
  before_created_at timestamptz default null,
  before_message_id uuid default null,
  result_limit integer default 50
)
returns table (
  message_id uuid,
  conversation_id uuid,
  author_id uuid,
  author_display_name text,
  author_handle text,
  author_avatar_path text,
  content text,
  reply_to_id uuid,
  reply_author_display_name text,
  reply_content text,
  attachment_summary jsonb,
  reaction_summary jsonb,
  created_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  can_edit boolean,
  can_delete boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_direct_conversation_participant(target_conversation_id) then
    raise exception using errcode = '42501', message = 'direct_access_required';
  end if;

  if result_limit not between 1 and 100 then
    raise exception using errcode = '22023', message = 'invalid_result_limit';
  end if;

  return query
  select
    messages.id,
    messages.conversation_id,
    messages.author_id,
    coalesce(authors.display_name, 'Conta removida'),
    coalesce(authors.handle, 'conta-removida'),
    authors.avatar_path,
    messages.content,
    messages.reply_to_id,
    reply_authors.display_name,
    replies.content,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'attachment_id', attachments.id,
            'storage_path', attachments.storage_path,
            'original_name', attachments.original_name,
            'mime_type', attachments.mime_type,
            'size_bytes', attachments.size_bytes
          )
          order by attachments.created_at, attachments.id
        )
        from public.direct_message_attachments as attachments
        where attachments.message_id = messages.id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'emoji', grouped.emoji,
            'count', grouped.reaction_count,
            'reacted_by_me', grouped.reacted_by_me
          )
          order by grouped.emoji
        )
        from (
          select
            reactions.emoji,
            count(*) as reaction_count,
            bool_or(reactions.profile_id = auth.uid()) as reacted_by_me
          from public.direct_message_reactions as reactions
          where reactions.message_id = messages.id
          group by reactions.emoji
        ) as grouped
      ),
      '[]'::jsonb
    ),
    messages.created_at,
    messages.edited_at,
    messages.deleted_at,
    messages.author_id = auth.uid() and messages.deleted_at is null,
    messages.author_id = auth.uid() and messages.deleted_at is null
  from public.direct_messages as messages
  left join public.profiles as authors on authors.id = messages.author_id
  left join public.direct_messages as replies on replies.id = messages.reply_to_id
  left join public.profiles as reply_authors on reply_authors.id = replies.author_id
  where messages.conversation_id = target_conversation_id
    and (
      before_created_at is null
      or (messages.created_at, messages.id) < (before_created_at, before_message_id)
    )
  order by messages.created_at desc, messages.id desc
  limit result_limit;
end;
$$;

create or replace function public.edit_direct_message(
  target_message_id uuid,
  new_content text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_content text := btrim(coalesce(new_content, ''));
begin
  if char_length(normalized_content) not between 1 and 2000 then
    raise exception using errcode = '22023', message = 'invalid_direct_message';
  end if;

  update public.direct_messages
  set content = normalized_content, edited_at = clock_timestamp()
  where direct_messages.id = target_message_id
    and direct_messages.author_id = auth.uid()
    and direct_messages.deleted_at is null
    and public.can_send_direct_message(direct_messages.conversation_id);

  if not found then
    raise exception using errcode = '42501', message = 'edit_message_required';
  end if;
end;
$$;

create or replace function public.delete_direct_message(target_message_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  attachment_paths text[];
begin
  if not exists (
    select 1
    from public.direct_messages as messages
    where messages.id = target_message_id
      and messages.author_id = auth.uid()
      and messages.deleted_at is null
      and public.is_direct_conversation_participant(messages.conversation_id)
  ) then
    raise exception using errcode = '42501', message = 'delete_message_required';
  end if;

  select coalesce(array_agg(attachments.storage_path), '{}'::text[])
  into attachment_paths
  from public.direct_message_attachments as attachments
  where attachments.message_id = target_message_id;

  update public.direct_messages
  set
    content = null,
    deleted_at = clock_timestamp(),
    deleted_by = auth.uid()
  where direct_messages.id = target_message_id;

  delete from public.direct_message_attachments
  where direct_message_attachments.message_id = target_message_id;

  return attachment_paths;
end;
$$;

create or replace function public.toggle_direct_message_reaction(
  target_message_id uuid,
  reaction_emoji text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_emoji text := btrim(reaction_emoji);
  conversation_id uuid;
begin
  if char_length(normalized_emoji) not between 1 and 16
    or normalized_emoji ~ '[[:cntrl:]]'
  then
    raise exception using errcode = '22023', message = 'invalid_reaction';
  end if;

  select messages.conversation_id
  into conversation_id
  from public.direct_messages as messages
  where messages.id = target_message_id
    and messages.deleted_at is null;

  if not found or not public.can_send_direct_message(conversation_id) then
    raise exception using errcode = '42501', message = 'direct_message_blocked';
  end if;

  delete from public.direct_message_reactions
  where direct_message_reactions.message_id = target_message_id
    and direct_message_reactions.profile_id = auth.uid()
    and direct_message_reactions.emoji = normalized_emoji;

  if found then
    return false;
  end if;

  insert into public.direct_message_reactions (
    message_id,
    profile_id,
    emoji
  )
  values (target_message_id, auth.uid(), normalized_emoji);

  return true;
end;
$$;

create or replace function public.mark_direct_conversation_read(
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.direct_conversation_participants
  set last_read_at = clock_timestamp()
  where direct_conversation_participants.conversation_id = target_conversation_id
    and direct_conversation_participants.profile_id = auth.uid();

  if not found then
    raise exception using errcode = '42501', message = 'direct_access_required';
  end if;
end;
$$;

create or replace function public.get_my_direct_attachment_paths()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(attachments.storage_path), '{}'::text[])
  from public.direct_message_attachments as attachments
  inner join public.direct_messages as messages
    on messages.id = attachments.message_id
  inner join public.direct_conversation_participants as participants
    on participants.conversation_id = messages.conversation_id
  where participants.profile_id = auth.uid();
$$;

alter table public.direct_conversations enable row level security;
alter table public.direct_conversations force row level security;
alter table public.direct_conversation_participants enable row level security;
alter table public.direct_conversation_participants force row level security;
alter table public.direct_messages enable row level security;
alter table public.direct_messages force row level security;
alter table public.direct_message_reactions enable row level security;
alter table public.direct_message_reactions force row level security;
alter table public.direct_message_attachments enable row level security;
alter table public.direct_message_attachments force row level security;

create policy direct_conversations_read_participants
on public.direct_conversations
for select
to authenticated
using (public.is_direct_conversation_participant(id));

create policy direct_participants_read_same_conversation
on public.direct_conversation_participants
for select
to authenticated
using (public.is_direct_conversation_participant(conversation_id));

create policy direct_messages_read_participants
on public.direct_messages
for select
to authenticated
using (public.is_direct_conversation_participant(conversation_id));

create policy direct_reactions_read_participants
on public.direct_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.direct_messages as messages
    where messages.id = direct_message_reactions.message_id
      and public.is_direct_conversation_participant(messages.conversation_id)
  )
);

create policy direct_attachments_read_participants
on public.direct_message_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.direct_messages as messages
    where messages.id = direct_message_attachments.message_id
      and public.is_direct_conversation_participant(messages.conversation_id)
  )
);

revoke all on table public.direct_conversations from anon, authenticated;
revoke all on table public.direct_conversation_participants from anon, authenticated;
revoke all on table public.direct_messages from anon, authenticated;
revoke all on table public.direct_message_reactions from anon, authenticated;
revoke all on table public.direct_message_attachments from anon, authenticated;

grant select on table public.direct_conversations to authenticated;
grant select on table public.direct_conversation_participants to authenticated;
grant select on table public.direct_messages to authenticated;
grant select on table public.direct_message_reactions to authenticated;
grant select on table public.direct_message_attachments to authenticated;

revoke all on function public.direct_conversation_key(uuid, uuid) from public;
revoke all on function public.cleanup_direct_conversation_after_participant() from public;
revoke all on function public.is_direct_conversation_participant(uuid, uuid) from public;
revoke all on function public.have_shared_server(uuid, uuid) from public;
revoke all on function public.can_start_direct_message(uuid) from public;
revoke all on function public.can_send_direct_message(uuid, uuid) from public;
revoke all on function public.open_direct_conversation(uuid) from public;
revoke all on function public.hide_direct_conversation(uuid) from public;
revoke all on function public.get_my_direct_conversations() from public;
revoke all on function public.can_upload_direct_attachment(text) from public;
revoke all on function public.can_view_direct_attachment(text) from public;
revoke all on function public.can_delete_direct_attachment(text) from public;
revoke all on function public.send_direct_message(uuid, text, uuid, jsonb) from public;
revoke all on function public.get_direct_messages(uuid, timestamptz, uuid, integer) from public;
revoke all on function public.edit_direct_message(uuid, text) from public;
revoke all on function public.delete_direct_message(uuid) from public;
revoke all on function public.toggle_direct_message_reaction(uuid, text) from public;
revoke all on function public.mark_direct_conversation_read(uuid) from public;
revoke all on function public.get_my_direct_attachment_paths() from public;

grant execute on function public.can_start_direct_message(uuid) to authenticated;
grant execute on function public.open_direct_conversation(uuid) to authenticated;
grant execute on function public.hide_direct_conversation(uuid) to authenticated;
grant execute on function public.get_my_direct_conversations() to authenticated;
grant execute on function public.send_direct_message(uuid, text, uuid, jsonb) to authenticated;
grant execute on function public.get_direct_messages(uuid, timestamptz, uuid, integer)
to authenticated;
grant execute on function public.edit_direct_message(uuid, text) to authenticated;
grant execute on function public.delete_direct_message(uuid) to authenticated;
grant execute on function public.toggle_direct_message_reaction(uuid, text) to authenticated;
grant execute on function public.mark_direct_conversation_read(uuid) to authenticated;
grant execute on function public.get_my_direct_attachment_paths() to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'direct-message-attachments',
  'direct-message-attachments',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy crypt_direct_attachments_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'direct-message-attachments'
  and public.can_upload_direct_attachment(name)
);

create policy crypt_direct_attachments_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'direct-message-attachments'
  and public.can_delete_direct_attachment(name)
);

create policy crypt_direct_attachments_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'direct-message-attachments'
  and public.can_view_direct_attachment(name)
);

do $$
begin
  alter publication supabase_realtime add table public.direct_conversations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime
    add table public.direct_conversation_participants;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.direct_message_reactions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

comment on table public.direct_conversations is
  'Contêiner de conversa preparado para grupos; a Fase 9 cria somente pares diretos.';
comment on table public.direct_conversation_participants is
  'Participantes, leitura e fechamento individual sem apagar o histórico.';
comment on function public.can_start_direct_message(uuid) is
  'Autoriza somente novas DMs conforme privacidade, amizade, servidor compartilhado e bloqueios.';
