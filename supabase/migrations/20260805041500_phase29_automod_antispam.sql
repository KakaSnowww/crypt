set lock_timeout = '5s';
set statement_timeout = '90s';

create table if not exists public.server_automod_settings (
  server_id uuid primary key
    references public.servers (id)
    on delete cascade,
  enabled boolean not null default false,
  block_spam boolean not null default true,
  max_messages smallint not null default 5,
  interval_seconds smallint not null default 10,
  block_duplicates boolean not null default true,
  duplicate_window_seconds smallint not null default 30,
  max_mentions smallint not null default 8,
  block_invite_links boolean not null default false,
  block_external_links boolean not null default false,
  blocked_terms text[] not null default '{}'::text[],
  updated_by uuid
    references public.profiles (id)
    on delete set null,
  updated_at timestamptz not null default clock_timestamp(),
  constraint server_automod_message_limit
    check (max_messages between 3 and 20),
  constraint server_automod_interval
    check (interval_seconds between 5 and 60),
  constraint server_automod_duplicate_window
    check (duplicate_window_seconds between 10 and 300),
  constraint server_automod_mention_limit
    check (max_mentions between 1 and 20),
  constraint server_automod_terms_limit
    check (cardinality(blocked_terms) <= 50)
);

create table if not exists public.server_automod_events (
  id bigint generated always as identity primary key,
  server_id uuid not null
    references public.servers (id)
    on delete cascade,
  channel_id uuid
    references public.server_channels (id)
    on delete set null,
  profile_id uuid
    references public.profiles (id)
    on delete set null,
  rule_code text not null,
  message_excerpt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  constraint server_automod_event_rule
    check (
      rule_code in (
        'blocked_term',
        'duplicate_message',
        'external_link',
        'invite_link',
        'mention_limit',
        'spam_burst'
      )
    ),
  constraint server_automod_event_excerpt
    check (
      message_excerpt is null
      or char_length(message_excerpt) <= 220
    ),
  constraint server_automod_event_metadata
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists server_automod_events_server_idx
on public.server_automod_events (
  server_id,
  created_at desc,
  id desc
);

create index if not exists server_automod_events_profile_idx
on public.server_automod_events (
  profile_id,
  created_at desc,
  id desc
);

create index if not exists channel_messages_automod_author_idx
on public.channel_messages (
  server_id,
  author_id,
  created_at desc
)
where deleted_at is null;

insert into public.server_automod_settings (server_id)
select servers.id
from public.servers
on conflict (server_id) do nothing;

create or replace function public.create_server_automod_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.server_automod_settings (server_id)
  values (new.id)
  on conflict (server_id) do nothing;

  return new;
end;
$$;

drop trigger if exists servers_create_automod_settings
on public.servers;

create trigger servers_create_automod_settings
after insert on public.servers
for each row
execute function public.create_server_automod_settings();

create or replace function public.can_manage_server_automod(
  target_server_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      public.is_server_owner(target_server_id)
      or public.has_server_permission(
        target_server_id,
        64
      )
    );
$$;

create or replace function public.get_server_automod_settings(
  target_server_id uuid
)
returns table (
  enabled boolean,
  block_spam boolean,
  max_messages smallint,
  interval_seconds smallint,
  block_duplicates boolean,
  duplicate_window_seconds smallint,
  max_mentions smallint,
  block_invite_links boolean,
  block_external_links boolean,
  blocked_terms text[],
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_server_automod(
    target_server_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'server_moderation_required';
  end if;

  return query
  select
    settings.enabled,
    settings.block_spam,
    settings.max_messages,
    settings.interval_seconds,
    settings.block_duplicates,
    settings.duplicate_window_seconds,
    settings.max_mentions,
    settings.block_invite_links,
    settings.block_external_links,
    settings.blocked_terms,
    settings.updated_at
  from public.server_automod_settings as settings
  where settings.server_id = target_server_id;
end;
$$;

create or replace function public.update_server_automod_settings(
  target_server_id uuid,
  automod_enabled boolean,
  spam_enabled boolean,
  spam_max_messages smallint,
  spam_interval_seconds smallint,
  duplicates_enabled boolean,
  duplicates_window_seconds smallint,
  mention_limit smallint,
  invite_links_blocked boolean,
  external_links_blocked boolean,
  terms text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_terms text[];
begin
  if not public.is_server_owner(target_server_id) then
    raise exception using
      errcode = '42501',
      message = 'server_owner_required';
  end if;

  if spam_max_messages not between 3 and 20
    or spam_interval_seconds not between 5 and 60
    or duplicates_window_seconds not between 10 and 300
    or mention_limit not between 1 and 20
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_automod_limits';
  end if;

  select coalesce(
    array_agg(normalized.term order by normalized.term),
    '{}'::text[]
  )
  into normalized_terms
  from (
    select distinct lower(btrim(item.term)) as term
    from unnest(coalesce(terms, '{}'::text[]))
      as item(term)
    where btrim(item.term) <> ''
  ) as normalized;

  if cardinality(normalized_terms) > 50
    or exists (
      select 1
      from unnest(normalized_terms) as item(term)
      where char_length(item.term) not between 2 and 40
        or item.term ~ '[[:cntrl:]]'
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_automod_terms';
  end if;

  insert into public.server_automod_settings (
    server_id,
    enabled,
    block_spam,
    max_messages,
    interval_seconds,
    block_duplicates,
    duplicate_window_seconds,
    max_mentions,
    block_invite_links,
    block_external_links,
    blocked_terms,
    updated_by,
    updated_at
  )
  values (
    target_server_id,
    automod_enabled,
    spam_enabled,
    spam_max_messages,
    spam_interval_seconds,
    duplicates_enabled,
    duplicates_window_seconds,
    mention_limit,
    invite_links_blocked,
    external_links_blocked,
    normalized_terms,
    auth.uid(),
    clock_timestamp()
  )
  on conflict (server_id) do update
  set
    enabled = excluded.enabled,
    block_spam = excluded.block_spam,
    max_messages = excluded.max_messages,
    interval_seconds = excluded.interval_seconds,
    block_duplicates = excluded.block_duplicates,
    duplicate_window_seconds = excluded.duplicate_window_seconds,
    max_mentions = excluded.max_mentions,
    block_invite_links = excluded.block_invite_links,
    block_external_links = excluded.block_external_links,
    blocked_terms = excluded.blocked_terms,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into public.server_audit_logs (
    server_id,
    actor_id,
    action,
    metadata
  )
  values (
    target_server_id,
    auth.uid(),
    'moderation_settings_updated',
    jsonb_build_object(
      'section',
      'automod',
      'enabled',
      automod_enabled
    )
  );
end;
$$;

create or replace function public.get_server_automod_events(
  target_server_id uuid,
  result_limit integer default 100
)
returns table (
  event_id bigint,
  channel_id uuid,
  channel_name text,
  profile_id uuid,
  profile_display_name text,
  profile_handle text,
  profile_avatar_path text,
  rule_code text,
  message_excerpt text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_server_automod(
    target_server_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'server_moderation_required';
  end if;

  if result_limit not between 1 and 200 then
    raise exception using
      errcode = '22023',
      message = 'invalid_automod_event_limit';
  end if;

  return query
  select
    events.id,
    events.channel_id,
    channels.name,
    events.profile_id,
    coalesce(
      profiles.display_name,
      'Conta removida'
    ),
    coalesce(
      profiles.handle,
      'conta_removida'
    ),
    profiles.avatar_path,
    events.rule_code,
    events.message_excerpt,
    events.metadata,
    events.created_at
  from public.server_automod_events as events
  left join public.server_channels as channels
    on channels.id = events.channel_id
  left join public.profiles
    on profiles.id = events.profile_id
  where events.server_id = target_server_id
  order by events.created_at desc, events.id desc
  limit result_limit;
end;
$$;

create or replace function public.evaluate_server_automod(
  target_server_id uuid,
  target_channel_id uuid,
  normalized_content text,
  mentioned_profile_ids uuid[],
  mentioned_channel_ids uuid[]
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  settings public.server_automod_settings%rowtype;
  normalized_message text :=
    lower(
      regexp_replace(
        btrim(coalesce(normalized_content, '')),
        '[[:space:]]+',
        ' ',
        'g'
      )
    );
  term text;
  mention_count integer;
begin
  select *
  into settings
  from public.server_automod_settings
  where server_id = target_server_id;

  if not found
    or not settings.enabled
    or public.is_server_owner(target_server_id)
    or (
      public.get_effective_channel_permissions(
        target_channel_id,
        auth.uid()
      ) & 2048
    ) = 2048
  then
    return null;
  end if;

  select count(distinct mention_id)
  into mention_count
  from unnest(
    coalesce(
      mentioned_profile_ids,
      '{}'::uuid[]
    )
    || coalesce(
      mentioned_channel_ids,
      '{}'::uuid[]
    )
  ) as mentions(mention_id);

  if mention_count > settings.max_mentions then
    return 'mention_limit';
  end if;

  foreach term in array settings.blocked_terms
  loop
    if position(term in normalized_message) > 0 then
      return 'blocked_term';
    end if;
  end loop;

  if settings.block_invite_links
    and normalized_message ~
      '(discord\.gg/|discord(app)?\.com/invite/|crypt://(invite|convite)|/convite/)'
  then
    return 'invite_link';
  end if;

  if settings.block_external_links
    and normalized_message ~
      '(https?://|www\.)'
  then
    return 'external_link';
  end if;

  if settings.block_duplicates
    and normalized_message <> ''
    and exists (
      select 1
      from public.channel_messages as messages
      where messages.channel_id = target_channel_id
        and messages.author_id = auth.uid()
        and messages.deleted_at is null
        and messages.created_at >
          now() - make_interval(
            secs =>
              settings.duplicate_window_seconds
          )
        and lower(
          regexp_replace(
            btrim(
              coalesce(messages.content, '')
            ),
            '[[:space:]]+',
            ' ',
            'g'
          )
        ) = normalized_message
    )
  then
    return 'duplicate_message';
  end if;

  if settings.block_spam
    and (
      select count(*)
      from public.channel_messages as messages
      where messages.server_id = target_server_id
        and messages.author_id = auth.uid()
        and messages.deleted_at is null
        and messages.created_at >
          now() - make_interval(
            secs => settings.interval_seconds
          )
    ) >= settings.max_messages
  then
    return 'spam_burst';
  end if;

  return null;
end;
$$;

create or replace function public.apply_server_automod(
  target_server_id uuid,
  target_channel_id uuid,
  normalized_content text,
  mentioned_profile_ids uuid[],
  mentioned_channel_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule_code text;
begin
  rule_code :=
    public.evaluate_server_automod(
      target_server_id,
      target_channel_id,
      normalized_content,
      mentioned_profile_ids,
      mentioned_channel_ids
    );

  if rule_code is null then
    return null;
  end if;

  insert into public.server_automod_events (
    server_id,
    channel_id,
    profile_id,
    rule_code,
    message_excerpt,
    metadata
  )
  values (
    target_server_id,
    target_channel_id,
    auth.uid(),
    rule_code,
    nullif(
      left(
        btrim(
          coalesce(normalized_content, '')
        ),
        220
      ),
      ''
    ),
    jsonb_build_object(
      'profile_mentions',
      cardinality(
        coalesce(
          mentioned_profile_ids,
          '{}'::uuid[]
        )
      ),
      'channel_mentions',
      cardinality(
        coalesce(
          mentioned_channel_ids,
          '{}'::uuid[]
        )
      )
    )
  );

  return rule_code;
end;
$$;

create or replace function public.get_my_latest_automod_event(
  target_server_id uuid,
  target_channel_id uuid
)
returns table (
  rule_code text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  return query
  select
    events.rule_code,
    events.created_at
  from public.server_automod_events as events
  where events.server_id = target_server_id
    and events.channel_id = target_channel_id
    and events.profile_id = auth.uid()
    and events.created_at >
      now() - interval '2 minutes'
  order by events.created_at desc, events.id desc
  limit 1;
end;
$$;

do $$
declare
  message_function regprocedure :=
    'public.send_channel_message(uuid,text,uuid,jsonb,uuid[],uuid[])'::regprocedure;
  definition text;
  insert_marker text :=
    E'  insert into public.channel_messages (\n';
  automod_block text :=
    E'  automod_rule := public.apply_server_automod(\n'
    || E'    channel_record.server_id,\n'
    || E'    target_channel_id,\n'
    || E'    normalized_content,\n'
    || E'    mentioned_profile_ids,\n'
    || E'    mentioned_channel_ids\n'
    || E'  );\n\n'
    || E'  if automod_rule is not null then\n'
    || E'    return null;\n'
    || E'  end if;\n\n';
begin
  select pg_get_functiondef(message_function)
  into definition;

  if position(
    'automod_rule text;' in definition
  ) = 0 then
    if position(
      '  permissions bigint;' in definition
    ) = 0 then
      raise exception
        'send_channel_message_declaration_not_found';
    end if;

    definition := replace(
      definition,
      '  permissions bigint;',
      E'  permissions bigint;\n  automod_rule text;'
    );
  end if;

  if position(
    'public.apply_server_automod(' in definition
  ) = 0 then
    if position(insert_marker in definition) = 0 then
      raise exception
        'send_channel_message_insert_not_found';
    end if;

    definition := replace(
      definition,
      insert_marker,
      automod_block || insert_marker
    );
  end if;

  execute definition;
end;
$$;

alter table public.server_automod_settings
enable row level security;

alter table public.server_automod_settings
force row level security;

alter table public.server_automod_events
enable row level security;

alter table public.server_automod_events
force row level security;

revoke all on table public.server_automod_settings
from public, anon, authenticated;

revoke all on table public.server_automod_events
from public, anon, authenticated;

revoke all on function public.create_server_automod_settings()
from public, anon, authenticated;

revoke all on function public.can_manage_server_automod(uuid)
from public, anon;

revoke all on function public.get_server_automod_settings(uuid)
from public, anon;

revoke all on function public.update_server_automod_settings(
  uuid,
  boolean,
  boolean,
  smallint,
  smallint,
  boolean,
  smallint,
  smallint,
  boolean,
  boolean,
  text[]
) from public, anon;

revoke all on function public.get_server_automod_events(
  uuid,
  integer
) from public, anon;

revoke all on function public.evaluate_server_automod(
  uuid,
  uuid,
  text,
  uuid[],
  uuid[]
) from public, anon, authenticated;

revoke all on function public.apply_server_automod(
  uuid,
  uuid,
  text,
  uuid[],
  uuid[]
) from public, anon, authenticated;

revoke all on function public.get_my_latest_automod_event(
  uuid,
  uuid
) from public, anon;

grant execute on function public.can_manage_server_automod(uuid)
to authenticated;

grant execute on function public.get_server_automod_settings(uuid)
to authenticated;

grant execute on function public.update_server_automod_settings(
  uuid,
  boolean,
  boolean,
  smallint,
  smallint,
  boolean,
  smallint,
  smallint,
  boolean,
  boolean,
  text[]
) to authenticated;

grant execute on function public.get_server_automod_events(
  uuid,
  integer
) to authenticated;

grant execute on function public.get_my_latest_automod_event(
  uuid,
  uuid
) to authenticated;

do $$
begin
  alter publication supabase_realtime
  add table public.server_automod_events;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

comment on function public.apply_server_automod(
  uuid,
  uuid,
  text,
  uuid[],
  uuid[]
) is
  'Avalia e registra uma tentativa bloqueada antes da criação da mensagem.';

comment on table public.server_automod_events is
  'Tentativas bloqueadas pelo AutoMod; escrita exclusiva do backend.';
