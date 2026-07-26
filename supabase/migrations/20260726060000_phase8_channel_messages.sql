set lock_timeout = '5s';
set statement_timeout = '60s';

alter table public.server_channels
add constraint server_channels_server_id_id_unique unique (server_id, id);

create table public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null,
  channel_id uuid not null,
  author_id uuid references public.profiles (id) on delete set null,
  content text not null default '',
  reply_to_id uuid references public.channel_messages (id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  pinned_at timestamptz,
  pinned_by uuid references public.profiles (id) on delete set null,
  foreign key (server_id, channel_id)
    references public.server_channels (server_id, id)
    on delete cascade,
  constraint channel_messages_content_length
    check (char_length(content) <= 2000),
  constraint channel_messages_edit_time
    check (edited_at is null or edited_at >= created_at),
  constraint channel_messages_delete_state
    check (
      (deleted_at is null and deleted_by is null)
      or (deleted_at is not null and content = '')
    ),
  constraint channel_messages_pin_state
    check (
      (pinned_at is null and pinned_by is null)
      or (pinned_at is not null and pinned_by is not null)
    )
);

create index channel_messages_history_idx
on public.channel_messages (channel_id, created_at desc, id desc);

create index channel_messages_author_idx
on public.channel_messages (author_id, created_at desc)
where author_id is not null;

create index channel_messages_pinned_idx
on public.channel_messages (channel_id, pinned_at desc)
where pinned_at is not null and deleted_at is null;

create table public.message_reactions (
  message_id uuid not null references public.channel_messages (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id, emoji),
  constraint message_reactions_emoji_length
    check (char_length(emoji) between 1 and 16),
  constraint message_reactions_emoji_safe
    check (emoji !~ '[[:cntrl:]]')
);

create index message_reactions_message_idx
on public.message_reactions (message_id, created_at);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.channel_messages (id) on delete cascade,
  uploader_id uuid references public.profiles (id) on delete set null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now(),
  constraint message_attachments_name_length
    check (char_length(original_name) between 1 and 160),
  constraint message_attachments_mime
    check (
      mime_type = any (
        array[
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'application/pdf',
          'text/plain'
        ]
      )
    ),
  constraint message_attachments_size
    check (size_bytes between 1 and 5242880),
  constraint message_attachments_path
    check (
      storage_path ~
        '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif|pdf|txt)$'
    )
);

create index message_attachments_message_idx
on public.message_attachments (message_id, created_at);

create table public.message_user_mentions (
  message_id uuid not null references public.channel_messages (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);

create index message_user_mentions_profile_idx
on public.message_user_mentions (profile_id, created_at desc);

create table public.message_channel_mentions (
  message_id uuid not null references public.channel_messages (id) on delete cascade,
  channel_id uuid not null references public.server_channels (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, channel_id)
);

create table public.channel_read_states (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  channel_id uuid not null references public.server_channels (id) on delete cascade,
  last_read_message_id uuid references public.channel_messages (id) on delete set null,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, channel_id)
);

create index channel_read_states_channel_idx
on public.channel_read_states (channel_id, profile_id);

create trigger channel_read_states_set_updated_at
before update on public.channel_read_states
for each row
execute function public.set_profile_updated_at();

comment on table public.channel_messages is
  'Mensagens de canais identificadas por UUID, com exclusão lógica, respostas e fixação.';
comment on table public.message_attachments is
  'Metadados dos anexos privados; os bytes ficam no bucket message-attachments.';
comment on table public.channel_read_states is
  'Última leitura por pessoa e canal para contagem de não lidas e menções.';

alter table public.channel_messages replica identity full;
alter table public.message_reactions replica identity full;
alter table public.message_attachments replica identity full;
alter table public.channel_read_states replica identity full;

create or replace function public.can_upload_message_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  target_server_id uuid;
  target_channel_id uuid;
  target_profile_id uuid;
  permissions bigint;
begin
  if auth.uid() is null
    or object_name is null
    or object_name !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif|pdf|txt)$'
  then
    return false;
  end if;

  path_parts := string_to_array(object_name, '/');
  target_server_id := path_parts[1]::uuid;
  target_channel_id := path_parts[2]::uuid;
  target_profile_id := path_parts[3]::uuid;

  if target_profile_id <> auth.uid()
    or not exists (
      select 1
      from public.server_channels
      where server_channels.id = target_channel_id
        and server_channels.server_id = target_server_id
    )
  then
    return false;
  end if;

  permissions := public.get_effective_channel_permissions(
    target_channel_id,
    auth.uid()
  );

  return (permissions & 8576) = 8576
    and public.can_send_message(target_channel_id, auth.uid());
exception
  when invalid_text_representation then
    return false;
end;
$$;

create or replace function public.can_view_message_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  target_server_id uuid;
  target_channel_id uuid;
begin
  if auth.uid() is null or object_name is null then
    return false;
  end if;

  path_parts := string_to_array(object_name, '/');

  if cardinality(path_parts) <> 4 then
    return false;
  end if;

  target_server_id := path_parts[1]::uuid;
  target_channel_id := path_parts[2]::uuid;

  return exists (
    select 1
    from public.server_channels
    where server_channels.id = target_channel_id
      and server_channels.server_id = target_server_id
  )
  and public.can_view_channel(target_channel_id, auth.uid());
exception
  when invalid_text_representation then
    return false;
end;
$$;

create or replace function public.can_delete_message_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  target_channel_id uuid;
  uploader_profile_id uuid;
begin
  if not public.can_view_message_attachment(object_name) then
    return false;
  end if;

  path_parts := string_to_array(object_name, '/');
  target_channel_id := path_parts[2]::uuid;
  uploader_profile_id := path_parts[3]::uuid;

  return uploader_profile_id = auth.uid()
    or (
      public.get_effective_channel_permissions(
        target_channel_id,
        auth.uid()
      ) & 2048
    ) = 2048;
exception
  when invalid_text_representation then
    return false;
end;
$$;

create or replace function public.send_channel_message(
  target_channel_id uuid,
  message_content text,
  target_reply_id uuid default null,
  attachment_items jsonb default '[]'::jsonb,
  mentioned_profile_ids uuid[] default '{}'::uuid[],
  mentioned_channel_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel_record public.server_channels%rowtype;
  normalized_content text := btrim(coalesce(message_content, ''));
  created_message_id uuid;
  attachment_item jsonb;
  attachment_count integer;
  permissions bigint;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select channels.*
  into channel_record
  from public.server_channels as channels
  where channels.id = target_channel_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'channel_not_found';
  end if;

  if not public.can_send_message(target_channel_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'send_messages_required';
  end if;

  if char_length(normalized_content) > 2000 then
    raise exception using errcode = '22023', message = 'invalid_message_content';
  end if;

  if jsonb_typeof(coalesce(attachment_items, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid_message_attachments';
  end if;

  attachment_count := jsonb_array_length(coalesce(attachment_items, '[]'::jsonb));

  if attachment_count > 3
    or (normalized_content = '' and attachment_count = 0)
  then
    raise exception using errcode = '22023', message = 'invalid_message_payload';
  end if;

  permissions := public.get_effective_channel_permissions(
    target_channel_id,
    auth.uid()
  );

  if attachment_count > 0 and (permissions & 8192) <> 8192 then
    raise exception using errcode = '42501', message = 'attach_files_required';
  end if;

  if target_reply_id is not null
    and not exists (
      select 1
      from public.channel_messages
      where channel_messages.id = target_reply_id
        and channel_messages.channel_id = target_channel_id
    )
  then
    raise exception using errcode = '22023', message = 'reply_channel_mismatch';
  end if;

  if channel_record.slowmode_seconds > 0
    and exists (
      select 1
      from public.channel_messages
      where channel_messages.channel_id = target_channel_id
        and channel_messages.author_id = auth.uid()
        and channel_messages.created_at >
          now() - make_interval(secs => channel_record.slowmode_seconds)
    )
    and not public.is_server_owner(channel_record.server_id)
    and (permissions & 2048) <> 2048
  then
    raise exception using errcode = '42501', message = 'message_slowmode_active';
  end if;

  if cardinality(coalesce(mentioned_profile_ids, '{}'::uuid[])) > 20
    or cardinality(coalesce(mentioned_channel_ids, '{}'::uuid[])) > 20
  then
    raise exception using errcode = '22023', message = 'too_many_message_mentions';
  end if;

  if exists (
    select 1
    from unnest(coalesce(mentioned_profile_ids, '{}'::uuid[])) as mentioned(profile_id)
    where not exists (
      select 1
      from public.server_members
      where server_members.server_id = channel_record.server_id
        and server_members.profile_id = mentioned.profile_id
    )
  ) then
    raise exception using errcode = '22023', message = 'mention_server_mismatch';
  end if;

  if exists (
    select 1
    from unnest(coalesce(mentioned_channel_ids, '{}'::uuid[])) as mentioned(channel_id)
    where not exists (
      select 1
      from public.server_channels
      where server_channels.server_id = channel_record.server_id
        and server_channels.id = mentioned.channel_id
        and public.can_view_channel(mentioned.channel_id, auth.uid())
    )
  ) then
    raise exception using errcode = '22023', message = 'mention_channel_mismatch';
  end if;

  insert into public.channel_messages (
    server_id,
    channel_id,
    author_id,
    content,
    reply_to_id
  )
  values (
    channel_record.server_id,
    target_channel_id,
    auth.uid(),
    normalized_content,
    target_reply_id
  )
  returning id into created_message_id;

  for attachment_item in
    select value
    from jsonb_array_elements(coalesce(attachment_items, '[]'::jsonb))
  loop
    if not public.can_upload_message_attachment(attachment_item ->> 'storage_path')
      or attachment_item ->> 'mime_type' not in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/plain'
      )
      or coalesce((attachment_item ->> 'size_bytes')::integer, 0) not between 1 and 5242880
      or char_length(coalesce(attachment_item ->> 'original_name', '')) not between 1 and 160
    then
      raise exception using errcode = '22023', message = 'invalid_message_attachment';
    end if;

    insert into public.message_attachments (
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

  insert into public.message_user_mentions (message_id, profile_id)
  select created_message_id, mentioned.profile_id
  from (
    select distinct unnest(coalesce(mentioned_profile_ids, '{}'::uuid[])) as profile_id
  ) as mentioned
  where mentioned.profile_id <> auth.uid();

  insert into public.message_channel_mentions (message_id, channel_id)
  select created_message_id, mentioned.channel_id
  from (
    select distinct unnest(coalesce(mentioned_channel_ids, '{}'::uuid[])) as channel_id
  ) as mentioned;

  return created_message_id;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'invalid_message_attachment';
end;
$$;

create or replace function public.get_channel_messages(
  target_channel_id uuid,
  before_created_at timestamptz default null,
  before_message_id uuid default null,
  result_limit integer default 50
)
returns table (
  message_id uuid,
  channel_id uuid,
  server_id uuid,
  author_id uuid,
  author_display_name text,
  author_handle text,
  author_avatar_path text,
  content text,
  created_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  reply_to_id uuid,
  reply_author_display_name text,
  reply_content text,
  pinned_at timestamptz,
  reaction_summary jsonb,
  attachment_summary jsonb,
  mentioned_profile_ids uuid[],
  mentioned_channel_ids uuid[],
  can_edit boolean,
  can_delete boolean,
  can_pin boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_view_channel(target_channel_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'view_channel_required';
  end if;

  if result_limit not between 1 and 100 then
    raise exception using errcode = '22023', message = 'invalid_message_page_size';
  end if;

  return query
  select
    messages.id,
    messages.channel_id,
    messages.server_id,
    messages.author_id,
    coalesce(authors.display_name, 'Conta removida'),
    coalesce(authors.handle, 'conta_removida'),
    authors.avatar_path,
    case when messages.deleted_at is null then messages.content else null end,
    messages.created_at,
    messages.edited_at,
    messages.deleted_at,
    messages.reply_to_id,
    reply_authors.display_name,
    case
      when replies.deleted_at is null then left(replies.content, 180)
      else null
    end,
    messages.pinned_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'emoji',
            grouped.emoji,
            'count',
            grouped.reaction_count,
            'reacted_by_me',
            grouped.reacted_by_me
          )
          order by grouped.emoji
        )
        from (
          select
            reactions.emoji,
            count(*) as reaction_count,
            bool_or(reactions.profile_id = auth.uid()) as reacted_by_me
          from public.message_reactions as reactions
          where reactions.message_id = messages.id
          group by reactions.emoji
        ) as grouped
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'attachment_id',
            attachments.id,
            'storage_path',
            attachments.storage_path,
            'original_name',
            attachments.original_name,
            'mime_type',
            attachments.mime_type,
            'size_bytes',
            attachments.size_bytes
          )
          order by attachments.created_at
        )
        from public.message_attachments as attachments
        where attachments.message_id = messages.id
          and messages.deleted_at is null
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select array_agg(mentions.profile_id order by mentions.profile_id)
        from public.message_user_mentions as mentions
        where mentions.message_id = messages.id
      ),
      '{}'::uuid[]
    ),
    coalesce(
      (
        select array_agg(mentions.channel_id order by mentions.channel_id)
        from public.message_channel_mentions as mentions
        where mentions.message_id = messages.id
      ),
      '{}'::uuid[]
    ),
    messages.deleted_at is null
      and messages.author_id = auth.uid()
      and (
        public.get_effective_channel_permissions(target_channel_id, auth.uid()) & 512
      ) = 512,
    messages.deleted_at is null
      and (
        (
          messages.author_id = auth.uid()
          and (
            public.get_effective_channel_permissions(target_channel_id, auth.uid()) & 1024
          ) = 1024
        )
        or (
          public.get_effective_channel_permissions(target_channel_id, auth.uid()) & 2048
        ) = 2048
      ),
    (
      public.get_effective_channel_permissions(target_channel_id, auth.uid()) & 32768
    ) = 32768
  from public.channel_messages as messages
  left join public.profiles as authors
    on authors.id = messages.author_id
  left join public.channel_messages as replies
    on replies.id = messages.reply_to_id
  left join public.profiles as reply_authors
    on reply_authors.id = replies.author_id
  where messages.channel_id = target_channel_id
    and (
      before_created_at is null
      or before_message_id is null
      or (messages.created_at, messages.id) < (before_created_at, before_message_id)
    )
  order by messages.created_at desc, messages.id desc
  limit result_limit;
end;
$$;

create or replace function public.edit_channel_message(
  target_message_id uuid,
  new_content text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_record public.channel_messages%rowtype;
  normalized_content text := btrim(coalesce(new_content, ''));
  permissions bigint;
begin
  select messages.*
  into message_record
  from public.channel_messages as messages
  where messages.id = target_message_id
  for update;

  if not found or message_record.deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'message_not_found';
  end if;

  permissions := public.get_effective_channel_permissions(
    message_record.channel_id,
    auth.uid()
  );

  if not (
    (message_record.author_id = auth.uid() and (permissions & 512) = 512)
    or (permissions & 2048) = 2048
  ) then
    raise exception using errcode = '42501', message = 'edit_message_required';
  end if;

  if char_length(normalized_content) not between 1 and 2000 then
    raise exception using errcode = '22023', message = 'invalid_message_content';
  end if;

  update public.channel_messages
  set
    content = normalized_content,
    edited_at = now()
  where channel_messages.id = target_message_id;
end;
$$;

create or replace function public.delete_channel_message(target_message_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_record public.channel_messages%rowtype;
  permissions bigint;
  attachment_paths text[];
begin
  select messages.*
  into message_record
  from public.channel_messages as messages
  where messages.id = target_message_id
  for update;

  if not found or message_record.deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'message_not_found';
  end if;

  permissions := public.get_effective_channel_permissions(
    message_record.channel_id,
    auth.uid()
  );

  if not (
    (
      message_record.author_id = auth.uid()
      and (permissions & 1024) = 1024
    )
    or (permissions & 2048) = 2048
  ) then
    raise exception using errcode = '42501', message = 'delete_message_required';
  end if;

  select coalesce(array_agg(attachments.storage_path), '{}'::text[])
  into attachment_paths
  from public.message_attachments as attachments
  where attachments.message_id = target_message_id;

  update public.channel_messages
  set
    content = '',
    deleted_at = now(),
    deleted_by = auth.uid(),
    pinned_at = null,
    pinned_by = null
  where channel_messages.id = target_message_id;

  delete from public.message_attachments
  where message_attachments.message_id = target_message_id;

  return attachment_paths;
end;
$$;

create or replace function public.toggle_message_reaction(
  target_message_id uuid,
  reaction_emoji text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_record public.channel_messages%rowtype;
  normalized_emoji text := btrim(coalesce(reaction_emoji, ''));
  permissions bigint;
begin
  select messages.*
  into message_record
  from public.channel_messages as messages
  where messages.id = target_message_id;

  if not found or message_record.deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'message_not_found';
  end if;

  permissions := public.get_effective_channel_permissions(
    message_record.channel_id,
    auth.uid()
  );

  if (permissions & 4224) <> 4224 then
    raise exception using errcode = '42501', message = 'add_reactions_required';
  end if;

  if char_length(normalized_emoji) not between 1 and 16
    or normalized_emoji ~ '[[:cntrl:]]'
  then
    raise exception using errcode = '22023', message = 'invalid_reaction_emoji';
  end if;

  delete from public.message_reactions
  where message_reactions.message_id = target_message_id
    and message_reactions.profile_id = auth.uid()
    and message_reactions.emoji = normalized_emoji;

  if found then
    return false;
  end if;

  insert into public.message_reactions (message_id, profile_id, emoji)
  values (target_message_id, auth.uid(), normalized_emoji);

  return true;
end;
$$;

create or replace function public.toggle_pin_channel_message(target_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_record public.channel_messages%rowtype;
  will_pin boolean;
begin
  select messages.*
  into message_record
  from public.channel_messages as messages
  where messages.id = target_message_id
  for update;

  if not found or message_record.deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'message_not_found';
  end if;

  if (
    public.get_effective_channel_permissions(
      message_record.channel_id,
      auth.uid()
    ) & 32768
  ) <> 32768 then
    raise exception using errcode = '42501', message = 'pin_messages_required';
  end if;

  will_pin := message_record.pinned_at is null;

  update public.channel_messages
  set
    pinned_at = case when will_pin then now() else null end,
    pinned_by = case when will_pin then auth.uid() else null end
  where channel_messages.id = target_message_id;

  return will_pin;
end;
$$;

create or replace function public.mark_channel_read(
  target_channel_id uuid,
  target_message_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_view_channel(target_channel_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'view_channel_required';
  end if;

  if target_message_id is not null
    and not exists (
      select 1
      from public.channel_messages
      where channel_messages.id = target_message_id
        and channel_messages.channel_id = target_channel_id
    )
  then
    raise exception using errcode = '22023', message = 'read_message_channel_mismatch';
  end if;

  insert into public.channel_read_states (
    profile_id,
    channel_id,
    last_read_message_id,
    last_read_at
  )
  values (
    auth.uid(),
    target_channel_id,
    target_message_id,
    now()
  )
  on conflict (profile_id, channel_id)
  do update
  set
    last_read_message_id = excluded.last_read_message_id,
    last_read_at = excluded.last_read_at,
    updated_at = now();
end;
$$;

create or replace function public.get_server_unread_counts(target_server_id uuid)
returns table (
  channel_id uuid,
  unread_count bigint,
  mention_count bigint
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
    count(messages.id) filter (
      where messages.author_id is distinct from auth.uid()
    ),
    count(user_mentions.message_id)
  from public.server_channels as channels
  left join public.channel_read_states as read_states
    on read_states.channel_id = channels.id
    and read_states.profile_id = auth.uid()
  left join public.channel_messages as messages
    on messages.channel_id = channels.id
    and messages.deleted_at is null
    and messages.created_at > coalesce(read_states.last_read_at, '-infinity'::timestamptz)
  left join public.message_user_mentions as user_mentions
    on user_mentions.message_id = messages.id
    and user_mentions.profile_id = auth.uid()
  where channels.server_id = target_server_id
    and public.can_view_channel(channels.id, auth.uid())
  group by channels.id
  order by channels.id;
end;
$$;

create or replace function public.get_server_message_attachment_paths(target_server_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_server_owner(target_server_id) then
    raise exception using errcode = '42501', message = 'server_owner_required';
  end if;

  return coalesce(
    (
      select array_agg(attachments.storage_path order by attachments.storage_path)
      from public.message_attachments as attachments
      inner join public.channel_messages as messages
        on messages.id = attachments.message_id
      where messages.server_id = target_server_id
    ),
    '{}'::text[]
  );
end;
$$;

alter table public.channel_messages enable row level security;
alter table public.channel_messages force row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reactions force row level security;
alter table public.message_attachments enable row level security;
alter table public.message_attachments force row level security;
alter table public.message_user_mentions enable row level security;
alter table public.message_user_mentions force row level security;
alter table public.message_channel_mentions enable row level security;
alter table public.message_channel_mentions force row level security;
alter table public.channel_read_states enable row level security;
alter table public.channel_read_states force row level security;

create policy channel_messages_read_visible
on public.channel_messages
for select
to authenticated
using (public.can_view_channel(channel_id));

create policy message_reactions_read_visible
on public.message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.channel_messages
    where channel_messages.id = message_reactions.message_id
      and public.can_view_channel(channel_messages.channel_id)
  )
);

create policy message_attachments_read_visible
on public.message_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.channel_messages
    where channel_messages.id = message_attachments.message_id
      and public.can_view_channel(channel_messages.channel_id)
  )
);

create policy message_user_mentions_read_visible
on public.message_user_mentions
for select
to authenticated
using (
  exists (
    select 1
    from public.channel_messages
    where channel_messages.id = message_user_mentions.message_id
      and public.can_view_channel(channel_messages.channel_id)
  )
);

create policy message_channel_mentions_read_visible
on public.message_channel_mentions
for select
to authenticated
using (
  exists (
    select 1
    from public.channel_messages
    where channel_messages.id = message_channel_mentions.message_id
      and public.can_view_channel(channel_messages.channel_id)
  )
);

create policy channel_read_states_read_own
on public.channel_read_states
for select
to authenticated
using (profile_id = (select auth.uid()));

revoke all on table public.channel_messages from anon, authenticated;
revoke all on table public.message_reactions from anon, authenticated;
revoke all on table public.message_attachments from anon, authenticated;
revoke all on table public.message_user_mentions from anon, authenticated;
revoke all on table public.message_channel_mentions from anon, authenticated;
revoke all on table public.channel_read_states from anon, authenticated;

grant select on table public.channel_messages to authenticated;
grant select on table public.message_reactions to authenticated;
grant select on table public.message_attachments to authenticated;
grant select on table public.message_user_mentions to authenticated;
grant select on table public.message_channel_mentions to authenticated;
grant select on table public.channel_read_states to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'message-attachments',
  'message-attachments',
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

create policy crypt_message_attachments_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-attachments'
  and public.can_upload_message_attachment(name)
);

create policy crypt_message_attachments_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'message-attachments'
  and public.can_view_message_attachment(name)
);

create policy crypt_message_attachments_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-attachments'
  and public.can_delete_message_attachment(name)
);

revoke all on function public.can_upload_message_attachment(text) from public;
revoke all on function public.can_view_message_attachment(text) from public;
revoke all on function public.can_delete_message_attachment(text) from public;
revoke all on function public.send_channel_message(
  uuid, text, uuid, jsonb, uuid[], uuid[]
) from public;
revoke all on function public.get_channel_messages(
  uuid, timestamptz, uuid, integer
) from public;
revoke all on function public.edit_channel_message(uuid, text) from public;
revoke all on function public.delete_channel_message(uuid) from public;
revoke all on function public.toggle_message_reaction(uuid, text) from public;
revoke all on function public.toggle_pin_channel_message(uuid) from public;
revoke all on function public.mark_channel_read(uuid, uuid) from public;
revoke all on function public.get_server_unread_counts(uuid) from public;
revoke all on function public.get_server_message_attachment_paths(uuid) from public;

grant execute on function public.can_upload_message_attachment(text) to authenticated;
grant execute on function public.can_view_message_attachment(text) to authenticated;
grant execute on function public.can_delete_message_attachment(text) to authenticated;
grant execute on function public.send_channel_message(
  uuid, text, uuid, jsonb, uuid[], uuid[]
) to authenticated;
grant execute on function public.get_channel_messages(
  uuid, timestamptz, uuid, integer
) to authenticated;
grant execute on function public.edit_channel_message(uuid, text) to authenticated;
grant execute on function public.delete_channel_message(uuid) to authenticated;
grant execute on function public.toggle_message_reaction(uuid, text) to authenticated;
grant execute on function public.toggle_pin_channel_message(uuid) to authenticated;
grant execute on function public.mark_channel_read(uuid, uuid) to authenticated;
grant execute on function public.get_server_unread_counts(uuid) to authenticated;
grant execute on function public.get_server_message_attachment_paths(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.channel_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.channel_read_states;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
