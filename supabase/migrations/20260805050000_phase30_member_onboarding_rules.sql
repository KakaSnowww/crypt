set lock_timeout = '5s';
set statement_timeout = '90s';

create table if not exists public.server_onboarding_settings (
  server_id uuid primary key
    references public.servers (id)
    on delete cascade,
  enabled boolean not null default false,
  welcome_title text not null default 'Bem-vindo(a) ao servidor',
  welcome_message text not null default
    'Antes de entrar, conheça as regras e escolha por onde deseja começar.',
  require_rules boolean not null default true,
  require_channel_selection boolean not null default false,
  enabled_at timestamptz,
  settings_version integer not null default 1,
  updated_by uuid
    references public.profiles (id)
    on delete set null,
  updated_at timestamptz not null default clock_timestamp(),
  constraint server_onboarding_title_length
    check (
      char_length(welcome_title) between 2 and 80
      and welcome_title !~ '[[:cntrl:]]'
    ),
  constraint server_onboarding_message_length
    check (
      char_length(welcome_message) between 2 and 1000
      and welcome_message !~ '[[:cntrl:]]'
    ),
  constraint server_onboarding_version_positive
    check (settings_version > 0),
  constraint server_onboarding_enabled_time
    check (
      (enabled and enabled_at is not null)
      or (not enabled and enabled_at is null)
    )
);

create table if not exists public.server_onboarding_rules (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null
    references public.servers (id)
    on delete cascade,
  title text not null,
  description text,
  position smallint not null default 0,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint server_onboarding_rule_title
    check (
      char_length(title) between 2 and 80
      and title !~ '[[:cntrl:]]'
    ),
  constraint server_onboarding_rule_description
    check (
      description is null
      or (
        char_length(description) between 2 and 500
        and description !~ '[[:cntrl:]]'
      )
    ),
  constraint server_onboarding_rule_position
    check (position between 0 and 9)
);

create index if not exists server_onboarding_rules_order_idx
on public.server_onboarding_rules (
  server_id,
  position,
  created_at
);

create table if not exists public.server_onboarding_featured_channels (
  server_id uuid not null
    references public.servers (id)
    on delete cascade,
  channel_id uuid not null
    references public.server_channels (id)
    on delete cascade,
  position smallint not null default 0,
  created_at timestamptz not null default clock_timestamp(),
  primary key (server_id, channel_id),
  constraint server_onboarding_featured_position
    check (position between 0 and 7)
);

create index if not exists server_onboarding_featured_order_idx
on public.server_onboarding_featured_channels (
  server_id,
  position,
  channel_id
);

create table if not exists public.server_member_onboarding (
  server_id uuid not null,
  profile_id uuid not null,
  settings_version integer not null,
  accepted_rule_ids uuid[] not null default '{}'::uuid[],
  selected_channel_ids uuid[] not null default '{}'::uuid[],
  completed_at timestamptz not null default clock_timestamp(),
  primary key (server_id, profile_id),
  foreign key (server_id, profile_id)
    references public.server_members (server_id, profile_id)
    on delete cascade,
  constraint server_member_onboarding_version
    check (settings_version > 0),
  constraint server_member_onboarding_rule_limit
    check (cardinality(accepted_rule_ids) <= 10),
  constraint server_member_onboarding_channel_limit
    check (cardinality(selected_channel_ids) <= 5)
);

insert into public.server_onboarding_settings (server_id)
select servers.id
from public.servers
on conflict (server_id) do nothing;

create or replace function public.create_server_onboarding_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.server_onboarding_settings (server_id)
  values (new.id)
  on conflict (server_id) do nothing;

  return new;
end;
$$;

drop trigger if exists servers_create_onboarding_settings
on public.servers;

create trigger servers_create_onboarding_settings
after insert on public.servers
for each row
execute function public.create_server_onboarding_settings();

create or replace function public.server_member_requires_onboarding(
  target_server_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select
        settings.enabled
        and settings.enabled_at is not null
        and memberships.joined_at >= settings.enabled_at
        and servers.owner_id <> target_profile_id
        and not exists (
          select 1
          from public.server_member_onboarding as completions
          where completions.server_id = target_server_id
            and completions.profile_id = target_profile_id
        )
      from public.server_members as memberships
      inner join public.servers
        on servers.id = memberships.server_id
      inner join public.server_onboarding_settings as settings
        on settings.server_id = memberships.server_id
      where memberships.server_id = target_server_id
        and memberships.profile_id = target_profile_id
    ),
    false
  );
$$;

create or replace function public.can_view_channel(
  target_channel_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      public.get_effective_channel_permissions(
        target_channel_id,
        target_profile_id
      ) & 128
    ) = 128
    and not public.server_member_requires_onboarding(
      (
        select channels.server_id
        from public.server_channels as channels
        where channels.id = target_channel_id
      ),
      target_profile_id
    );
$$;

create or replace function public.get_server_onboarding_status(
  target_server_id uuid
)
returns table (
  server_id uuid,
  server_name text,
  server_description text,
  icon_path text,
  banner_path text,
  is_owner boolean,
  onboarding_enabled boolean,
  onboarding_required boolean,
  onboarding_completed boolean,
  welcome_title text,
  welcome_message text,
  rules_required boolean,
  channel_selection_required boolean,
  settings_version integer,
  rules jsonb,
  featured_channels jsonb,
  selected_channel_ids uuid[],
  completed_at timestamptz,
  enabled_at timestamptz
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

  if not public.is_server_member(target_server_id) then
    raise exception using
      errcode = '42501',
      message = 'server_membership_required';
  end if;

  return query
  select
    servers.id,
    servers.name,
    servers.description,
    servers.icon_path,
    servers.banner_path,
    servers.owner_id = auth.uid(),
    settings.enabled,
    public.server_member_requires_onboarding(
      target_server_id,
      auth.uid()
    ),
    not public.server_member_requires_onboarding(
      target_server_id,
      auth.uid()
    ),
    settings.welcome_title,
    settings.welcome_message,
    (
      settings.require_rules
      and exists (
        select 1
        from public.server_onboarding_rules as required_rules
        where required_rules.server_id = target_server_id
      )
    ),
    (
      settings.require_channel_selection
      and exists (
        select 1
        from public.server_onboarding_featured_channels as required_channels
        where required_channels.server_id = target_server_id
      )
    ),
    settings.settings_version,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'rule_id', rules.id,
            'title', rules.title,
            'description', rules.description,
            'position', rules.position
          )
          order by rules.position, rules.created_at
        )
        from public.server_onboarding_rules as rules
        where rules.server_id = target_server_id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'channel_id', channels.id,
            'channel_name', channels.name,
            'channel_type', channels.channel_type,
            'channel_icon', channels.icon,
            'topic', channels.topic,
            'position', featured.position
          )
          order by featured.position, channels.created_at
        )
        from public.server_onboarding_featured_channels as featured
        inner join public.server_channels as channels
          on channels.id = featured.channel_id
        where featured.server_id = target_server_id
          and channels.server_id = target_server_id
          and (
            public.get_effective_channel_permissions(
              channels.id,
              auth.uid()
            ) & 128
          ) = 128
      ),
      '[]'::jsonb
    ),
    coalesce(
      completion.selected_channel_ids,
      '{}'::uuid[]
    ),
    completion.completed_at,
    settings.enabled_at
  from public.servers
  inner join public.server_onboarding_settings as settings
    on settings.server_id = servers.id
  left join public.server_member_onboarding as completion
    on completion.server_id = servers.id
    and completion.profile_id = auth.uid()
  where servers.id = target_server_id;
end;
$$;

create or replace function public.update_server_onboarding_settings(
  target_server_id uuid,
  onboarding_enabled boolean,
  onboarding_welcome_title text,
  onboarding_welcome_message text,
  rules_must_be_accepted boolean,
  channel_must_be_selected boolean,
  rules_payload jsonb,
  featured_channel_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_title text :=
    btrim(coalesce(onboarding_welcome_title, ''));
  normalized_message text :=
    btrim(coalesce(onboarding_welcome_message, ''));
  normalized_featured uuid[];
  previous_enabled boolean := false;
  rule_item jsonb;
  rule_title text;
  rule_description text;
  rule_position integer := 0;
  next_version integer;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not public.is_server_owner(target_server_id) then
    raise exception using
      errcode = '42501',
      message = 'server_owner_required';
  end if;

  if char_length(normalized_title) not between 2 and 80
    or normalized_title ~ '[[:cntrl:]]'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_onboarding_title';
  end if;

  if char_length(normalized_message) not between 2 and 1000
    or normalized_message ~ '[[:cntrl:]]'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_onboarding_message';
  end if;

  if jsonb_typeof(coalesce(rules_payload, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(rules_payload, '[]'::jsonb)) > 10
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_onboarding_rules';
  end if;

  select coalesce(
    array_agg(
      distinct_channels.channel_id
      order by distinct_channels.first_position
    ),
    '{}'::uuid[]
  )
  into normalized_featured
  from (
    select
      listed.channel_id,
      min(listed.position) as first_position
    from unnest(
      coalesce(featured_channel_ids, '{}'::uuid[])
    ) with ordinality as listed(channel_id, position)
    group by listed.channel_id
  ) as distinct_channels;

  if cardinality(normalized_featured) > 8
    or exists (
      select 1
      from unnest(normalized_featured) as selected(channel_id)
      where not exists (
        select 1
        from public.server_channels as channels
        where channels.id = selected.channel_id
          and channels.server_id = target_server_id
      )
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_onboarding_channels';
  end if;

  select settings.enabled
  into previous_enabled
  from public.server_onboarding_settings as settings
  where settings.server_id = target_server_id
  for update;

  previous_enabled := coalesce(previous_enabled, false);

  insert into public.server_onboarding_settings (
    server_id,
    enabled,
    welcome_title,
    welcome_message,
    require_rules,
    require_channel_selection,
    enabled_at,
    settings_version,
    updated_by,
    updated_at
  )
  values (
    target_server_id,
    onboarding_enabled,
    normalized_title,
    normalized_message,
    (
      rules_must_be_accepted
      and jsonb_array_length(
        coalesce(rules_payload, '[]'::jsonb)
      ) > 0
    ),
    (
      channel_must_be_selected
      and cardinality(normalized_featured) > 0
    ),
    case
      when onboarding_enabled and not previous_enabled
        then clock_timestamp()
      when onboarding_enabled
        then (
          select settings.enabled_at
          from public.server_onboarding_settings as settings
          where settings.server_id = target_server_id
        )
      else null
    end,
    coalesce(
      (
        select settings.settings_version + 1
        from public.server_onboarding_settings as settings
        where settings.server_id = target_server_id
      ),
      1
    ),
    auth.uid(),
    clock_timestamp()
  )
  on conflict (server_id) do update
  set
    enabled = excluded.enabled,
    welcome_title = excluded.welcome_title,
    welcome_message = excluded.welcome_message,
    require_rules = excluded.require_rules,
    require_channel_selection = excluded.require_channel_selection,
    enabled_at = excluded.enabled_at,
    settings_version = excluded.settings_version,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
  returning settings_version into next_version;

  delete from public.server_onboarding_rules
  where server_id = target_server_id;

  for rule_item in
    select value
    from jsonb_array_elements(
      coalesce(rules_payload, '[]'::jsonb)
    )
  loop
    rule_title :=
      btrim(coalesce(rule_item ->> 'title', ''));
    rule_description :=
      nullif(
        btrim(coalesce(rule_item ->> 'description', '')),
        ''
      );

    if jsonb_typeof(rule_item) <> 'object'
      or char_length(rule_title) not between 2 and 80
      or rule_title ~ '[[:cntrl:]]'
      or (
        rule_description is not null
        and (
          char_length(rule_description) not between 2 and 500
          or rule_description ~ '[[:cntrl:]]'
        )
      )
    then
      raise exception using
        errcode = '22023',
        message = 'invalid_onboarding_rules';
    end if;

    insert into public.server_onboarding_rules (
      server_id,
      title,
      description,
      position
    )
    values (
      target_server_id,
      rule_title,
      rule_description,
      rule_position
    );

    rule_position := rule_position + 1;
  end loop;

  delete from public.server_onboarding_featured_channels
  where server_id = target_server_id;

  insert into public.server_onboarding_featured_channels (
    server_id,
    channel_id,
    position
  )
  select
    target_server_id,
    selected.channel_id,
    (selected.position - 1)::smallint
  from unnest(normalized_featured)
    with ordinality as selected(channel_id, position);

  if to_regclass('public.server_audit_logs') is not null then
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
        'member_onboarding',
        'enabled',
        onboarding_enabled,
        'settings_version',
        next_version
      )
    );
  end if;
end;
$$;

create or replace function public.complete_server_onboarding(
  target_server_id uuid,
  accepted_rule_ids uuid[],
  selected_channel_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.server_onboarding_settings%rowtype;
  normalized_rules uuid[];
  normalized_channels uuid[];
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not public.is_server_member(target_server_id) then
    raise exception using
      errcode = '42501',
      message = 'server_membership_required';
  end if;

  select *
  into settings
  from public.server_onboarding_settings
  where server_id = target_server_id
  for update;

  if not public.server_member_requires_onboarding(
    target_server_id,
    auth.uid()
  ) then
    return;
  end if;

  select coalesce(
    array_agg(item.id order by item.id),
    '{}'::uuid[]
  )
  into normalized_rules
  from (
    select distinct accepted.id
    from unnest(
      coalesce(accepted_rule_ids, '{}'::uuid[])
    ) as accepted(id)
  ) as item;

  select coalesce(
    array_agg(
      item.id
      order by item.first_position
    ),
    '{}'::uuid[]
  )
  into normalized_channels
  from (
    select
      selected.id,
      min(selected.position) as first_position
    from unnest(
      coalesce(selected_channel_ids, '{}'::uuid[])
    ) with ordinality as selected(id, position)
    group by selected.id
  ) as item;

  if cardinality(normalized_rules) > 10
    or cardinality(normalized_channels) > 5
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_onboarding_completion';
  end if;

  if settings.require_rules
    and exists (
      select 1
      from public.server_onboarding_rules as rules
      where rules.server_id = target_server_id
        and not (
          rules.id = any(normalized_rules)
        )
    )
  then
    raise exception using
      errcode = '22023',
      message = 'onboarding_rules_required';
  end if;

  if exists (
    select 1
    from unnest(normalized_rules) as accepted(id)
    where not exists (
      select 1
      from public.server_onboarding_rules as rules
      where rules.server_id = target_server_id
        and rules.id = accepted.id
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_onboarding_rules';
  end if;

  if settings.require_channel_selection
    and cardinality(normalized_channels) = 0
  then
    raise exception using
      errcode = '22023',
      message = 'onboarding_channel_required';
  end if;

  if exists (
    select 1
    from unnest(normalized_channels) as selected(id)
    where not exists (
      select 1
      from public.server_onboarding_featured_channels as featured
      inner join public.server_channels as channels
        on channels.id = featured.channel_id
      where featured.server_id = target_server_id
        and featured.channel_id = selected.id
        and channels.server_id = target_server_id
        and (
          public.get_effective_channel_permissions(
            channels.id,
            auth.uid()
          ) & 128
        ) = 128
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_onboarding_channels';
  end if;

  insert into public.server_member_onboarding (
    server_id,
    profile_id,
    settings_version,
    accepted_rule_ids,
    selected_channel_ids,
    completed_at
  )
  values (
    target_server_id,
    auth.uid(),
    settings.settings_version,
    normalized_rules,
    normalized_channels,
    clock_timestamp()
  )
  on conflict (server_id, profile_id) do update
  set
    settings_version = excluded.settings_version,
    accepted_rule_ids = excluded.accepted_rule_ids,
    selected_channel_ids = excluded.selected_channel_ids,
    completed_at = excluded.completed_at;
end;
$$;

alter table public.server_onboarding_settings
enable row level security;

alter table public.server_onboarding_settings
force row level security;

alter table public.server_onboarding_rules
enable row level security;

alter table public.server_onboarding_rules
force row level security;

alter table public.server_onboarding_featured_channels
enable row level security;

alter table public.server_onboarding_featured_channels
force row level security;

alter table public.server_member_onboarding
enable row level security;

alter table public.server_member_onboarding
force row level security;

revoke all on table public.server_onboarding_settings
from public, anon, authenticated;

revoke all on table public.server_onboarding_rules
from public, anon, authenticated;

revoke all on table public.server_onboarding_featured_channels
from public, anon, authenticated;

revoke all on table public.server_member_onboarding
from public, anon, authenticated;

revoke all on function public.create_server_onboarding_settings()
from public, anon, authenticated;

revoke all on function public.server_member_requires_onboarding(
  uuid,
  uuid
) from public, anon, authenticated;

revoke all on function public.get_server_onboarding_status(uuid)
from public, anon;

revoke all on function public.update_server_onboarding_settings(
  uuid,
  boolean,
  text,
  text,
  boolean,
  boolean,
  jsonb,
  uuid[]
) from public, anon;

revoke all on function public.complete_server_onboarding(
  uuid,
  uuid[],
  uuid[]
) from public, anon;

grant execute on function public.get_server_onboarding_status(uuid)
to authenticated;

grant execute on function public.update_server_onboarding_settings(
  uuid,
  boolean,
  text,
  text,
  boolean,
  boolean,
  jsonb,
  uuid[]
) to authenticated;

grant execute on function public.complete_server_onboarding(
  uuid,
  uuid[],
  uuid[]
) to authenticated;

comment on table public.server_member_onboarding is
  'Conclusão da entrada de novos membros; removida automaticamente ao sair do servidor.';

comment on function public.server_member_requires_onboarding(
  uuid,
  uuid
) is
  'Bloqueia somente membros que entraram após a ativação e ainda não concluíram a entrada.';
