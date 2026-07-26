set lock_timeout = '5s';
set statement_timeout = '60s';

create or replace function public.normalize_server_name(input_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    btrim(coalesce(input_value, '')),
    '[[:space:]]+',
    ' ',
    'g'
  );
$$;

create table public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon_path text,
  banner_path text,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servers_name_length
    check (char_length(name) between 2 and 80),
  constraint servers_name_normalized
    check (
      name = public.normalize_server_name(name)
      and name !~ '[[:cntrl:]]'
    ),
  constraint servers_description_length
    check (description is null or char_length(description) <= 500),
  constraint servers_description_normalized
    check (
      description is null
      or (
        description = btrim(description)
        and description !~ '[[:cntrl:]]'
      )
    ),
  constraint servers_private_phase6
    check (is_private),
  constraint servers_icon_path
    check (
      icon_path is null
      or (
        split_part(icon_path, '/', 1) = id::text
        and icon_path ~ '^[0-9a-f-]{36}/icon-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
      )
    ),
  constraint servers_banner_path
    check (
      banner_path is null
      or (
        split_part(banner_path, '/', 1) = id::text
        and banner_path ~ '^[0-9a-f-]{36}/banner-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
      )
    )
);

create index servers_owner_idx
on public.servers (owner_id, created_at desc);

create trigger servers_set_updated_at
before update on public.servers
for each row
execute function public.set_profile_updated_at();

create table public.server_members (
  server_id uuid not null references public.servers (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (server_id, profile_id)
);

create index server_members_profile_idx
on public.server_members (profile_id, joined_at desc);

create table public.server_roles (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null,
  color text,
  position integer not null default 0,
  is_default boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  constraint server_roles_name_length
    check (char_length(name) between 1 and 64),
  constraint server_roles_name_normalized
    check (
      name = public.normalize_server_name(name)
      and name !~ '[[:cntrl:]]'
    ),
  constraint server_roles_color_format
    check (color is null or color ~ '^#[0-9A-Fa-f]{6}$')
);

create unique index server_roles_one_default_idx
on public.server_roles (server_id)
where is_default;

create unique index server_roles_name_idx
on public.server_roles (server_id, lower(name));

create table public.server_channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  channel_type text not null default 'text',
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint server_channels_name_length
    check (char_length(name) between 1 and 80),
  constraint server_channels_name_normalized
    check (
      name = public.normalize_server_name(name)
      and name !~ '[[:cntrl:]]'
      and normalized_name = lower(public.normalize_server_name(name))
    ),
  constraint server_channels_type_phase6
    check (channel_type = 'text')
);

create unique index server_channels_name_idx
on public.server_channels (server_id, normalized_name);

create index server_channels_order_idx
on public.server_channels (server_id, position, created_at);

create table public.server_invites (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  uses_count integer not null default 0,
  revoked_at timestamptz,
  constraint server_invites_code_format
    check (code ~ '^[a-f0-9]{36}$'),
  constraint server_invites_expiry
    check (expires_at is null or expires_at > created_at),
  constraint server_invites_max_uses
    check (max_uses is null or max_uses between 1 and 1000),
  constraint server_invites_uses_count
    check (
      uses_count >= 0
      and (max_uses is null or uses_count <= max_uses)
    )
);

create index server_invites_server_idx
on public.server_invites (server_id, revoked_at, expires_at, created_at desc);

create table public.server_bans (
  server_id uuid not null references public.servers (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  banned_by uuid references public.profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  primary key (server_id, profile_id),
  constraint server_bans_reason_length
    check (reason is null or char_length(reason) <= 300)
);

comment on table public.servers is
  'Comunidades privadas do Crypt. A nomenclatura de interface pode mudar sem alterar os IDs.';
comment on table public.server_roles is
  'Base mínima de cargos da Fase 6. Permissões e hierarquia entram na Fase 7.';
comment on table public.server_channels is
  'Canal de texto inicial com UUID permanente. Organização e permissões entram na Fase 7.';
comment on table public.server_bans is
  'Reserva segura para impedir entrada por convite; a moderação será exposta em fase posterior.';

create or replace function public.is_server_member(target_server_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.server_members
      where server_members.server_id = target_server_id
        and server_members.profile_id = auth.uid()
    );
$$;

create or replace function public.is_server_owner(target_server_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.servers
      where servers.id = target_server_id
        and servers.owner_id = auth.uid()
    );
$$;

create or replace function public.create_server(
  server_name text,
  server_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  normalized_name text := public.normalize_server_name(server_name);
  normalized_description text := nullif(btrim(coalesce(server_description, '')), '');
  created_server_id uuid;
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if server_name ~ '[[:cntrl:]]'
    or char_length(normalized_name) not between 2 and 80
  then
    raise exception using errcode = '22023', message = 'invalid_server_name';
  end if;

  if normalized_description is not null
    and (
      server_description ~ '[[:cntrl:]]'
      or char_length(normalized_description) > 500
    )
  then
    raise exception using errcode = '22023', message = 'invalid_server_description';
  end if;

  insert into public.servers (
    name,
    description,
    owner_id
  )
  values (
    normalized_name,
    normalized_description,
    current_profile_id
  )
  returning id into created_server_id;

  insert into public.server_members (server_id, profile_id)
  values (created_server_id, current_profile_id);

  insert into public.server_roles (
    server_id,
    name,
    position,
    is_default,
    is_system
  )
  values (
    created_server_id,
    '@everyone',
    0,
    true,
    true
  );

  insert into public.server_channels (
    server_id,
    name,
    normalized_name,
    channel_type,
    position,
    created_by
  )
  values (
    created_server_id,
    'Conversa Geral',
    'conversa geral',
    'text',
    0,
    current_profile_id
  );

  return created_server_id;
end;
$$;

create or replace function public.get_my_servers()
returns table (
  server_id uuid,
  server_name text,
  server_description text,
  icon_path text,
  banner_path text,
  owner_id uuid,
  is_owner boolean,
  member_count bigint,
  joined_at timestamptz,
  created_at timestamptz,
  default_channel_id uuid,
  default_channel_name text
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
    servers.id,
    servers.name,
    servers.description,
    servers.icon_path,
    servers.banner_path,
    servers.owner_id,
    servers.owner_id = auth.uid(),
    (
      select count(*)
      from public.server_members as count_members
      where count_members.server_id = servers.id
    ),
    memberships.joined_at,
    servers.created_at,
    default_channel.id,
    default_channel.name
  from public.server_members as memberships
  inner join public.servers
    on servers.id = memberships.server_id
  left join lateral (
    select channels.id, channels.name
    from public.server_channels as channels
    where channels.server_id = servers.id
    order by channels.position, channels.created_at
    limit 1
  ) as default_channel on true
  where memberships.profile_id = auth.uid()
  order by memberships.joined_at, servers.name;
end;
$$;

create or replace function public.get_server_overview(target_server_id uuid)
returns table (
  server_id uuid,
  server_name text,
  server_description text,
  icon_path text,
  banner_path text,
  owner_id uuid,
  owner_display_name text,
  owner_handle text,
  is_owner boolean,
  is_private boolean,
  member_count bigint,
  created_at timestamptz,
  updated_at timestamptz,
  default_channel_id uuid,
  default_channel_name text
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

  if not public.is_server_member(target_server_id) then
    raise exception using errcode = '42501', message = 'server_membership_required';
  end if;

  return query
  select
    servers.id,
    servers.name,
    servers.description,
    servers.icon_path,
    servers.banner_path,
    servers.owner_id,
    owners.display_name,
    owners.handle,
    servers.owner_id = auth.uid(),
    servers.is_private,
    (
      select count(*)
      from public.server_members as count_members
      where count_members.server_id = servers.id
    ),
    servers.created_at,
    servers.updated_at,
    default_channel.id,
    default_channel.name
  from public.servers
  inner join public.profiles as owners
    on owners.id = servers.owner_id
  left join lateral (
    select channels.id, channels.name
    from public.server_channels as channels
    where channels.server_id = servers.id
    order by channels.position, channels.created_at
    limit 1
  ) as default_channel on true
  where servers.id = target_server_id;
end;
$$;

create or replace function public.get_server_members(target_server_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  joined_at timestamptz,
  is_owner boolean,
  presence_status text,
  is_online boolean
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

  if not public.is_server_member(target_server_id) then
    raise exception using errcode = '42501', message = 'server_membership_required';
  end if;

  return query
  select
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    memberships.joined_at,
    servers.owner_id = profiles.id,
    case
      when settings.show_online_status
        and presence.last_seen_at > now() - interval '2 minutes'
        and presence.status <> 'offline'
      then presence.status
      else 'offline'
    end,
    (
      settings.show_online_status
      and presence.last_seen_at > now() - interval '2 minutes'
      and presence.status <> 'offline'
    )
  from public.server_members as memberships
  inner join public.servers
    on servers.id = memberships.server_id
  inner join public.profiles
    on profiles.id = memberships.profile_id
  inner join public.profile_settings as settings
    on settings.profile_id = profiles.id
  left join public.user_presence as presence
    on presence.profile_id = profiles.id
  where memberships.server_id = target_server_id
  order by
    (servers.owner_id = profiles.id) desc,
    (
      settings.show_online_status
      and presence.last_seen_at > now() - interval '2 minutes'
      and presence.status <> 'offline'
    ) desc,
    profiles.display_name,
    profiles.handle;
end;
$$;

create or replace function public.update_server_settings(
  target_server_id uuid,
  server_name text,
  server_description text default null,
  server_icon_path text default null,
  server_banner_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := public.normalize_server_name(server_name);
  normalized_description text := nullif(btrim(coalesce(server_description, '')), '');
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not public.is_server_owner(target_server_id) then
    raise exception using errcode = '42501', message = 'server_owner_required';
  end if;

  if server_name ~ '[[:cntrl:]]'
    or char_length(normalized_name) not between 2 and 80
  then
    raise exception using errcode = '22023', message = 'invalid_server_name';
  end if;

  if normalized_description is not null
    and (
      server_description ~ '[[:cntrl:]]'
      or char_length(normalized_description) > 500
    )
  then
    raise exception using errcode = '22023', message = 'invalid_server_description';
  end if;

  if server_icon_path is not null
    and server_icon_path !~
      ('^' || target_server_id::text || '/icon-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$')
  then
    raise exception using errcode = '22023', message = 'invalid_server_icon_path';
  end if;

  if server_banner_path is not null
    and server_banner_path !~
      ('^' || target_server_id::text || '/banner-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$')
  then
    raise exception using errcode = '22023', message = 'invalid_server_banner_path';
  end if;

  update public.servers
  set
    name = normalized_name,
    description = normalized_description,
    icon_path = server_icon_path,
    banner_path = server_banner_path,
    updated_at = now()
  where servers.id = target_server_id;
end;
$$;

create or replace function public.create_server_invite(
  target_server_id uuid,
  expires_in_hours integer default 168,
  invite_max_uses integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not public.is_server_member(target_server_id) then
    raise exception using errcode = '42501', message = 'server_membership_required';
  end if;

  if expires_in_hours is not null
    and expires_in_hours not between 1 and 8760
  then
    raise exception using errcode = '22023', message = 'invalid_invite_expiration';
  end if;

  if invite_max_uses is not null
    and invite_max_uses not between 1 and 1000
  then
    raise exception using errcode = '22023', message = 'invalid_invite_max_uses';
  end if;

  loop
    generated_code := encode(extensions.gen_random_bytes(18), 'hex');
    exit when not exists (
      select 1
      from public.server_invites
      where server_invites.code = generated_code
    );
  end loop;

  insert into public.server_invites (
    server_id,
    code,
    created_by,
    expires_at,
    max_uses
  )
  values (
    target_server_id,
    generated_code,
    auth.uid(),
    case
      when expires_in_hours is null then null
      else now() + make_interval(hours => expires_in_hours)
    end,
    invite_max_uses
  );

  return generated_code;
end;
$$;

create or replace function public.get_server_invites(target_server_id uuid)
returns table (
  invite_id uuid,
  invite_code text,
  created_by uuid,
  creator_display_name text,
  creator_handle text,
  created_at timestamptz,
  expires_at timestamptz,
  max_uses integer,
  uses_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_profile_is_owner boolean := public.is_server_owner(target_server_id);
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not public.is_server_member(target_server_id) then
    raise exception using errcode = '42501', message = 'server_membership_required';
  end if;

  return query
  select
    invites.id,
    invites.code,
    invites.created_by,
    creators.display_name,
    creators.handle,
    invites.created_at,
    invites.expires_at,
    invites.max_uses,
    invites.uses_count
  from public.server_invites as invites
  inner join public.profiles as creators
    on creators.id = invites.created_by
  where invites.server_id = target_server_id
    and invites.revoked_at is null
    and (invites.expires_at is null or invites.expires_at > now())
    and (invites.max_uses is null or invites.uses_count < invites.max_uses)
    and (
      current_profile_is_owner
      or invites.created_by = auth.uid()
    )
  order by invites.created_at desc;
end;
$$;

create or replace function public.get_server_invite_preview(invite_code text)
returns table (
  server_id uuid,
  server_name text,
  server_description text,
  icon_path text,
  banner_path text,
  owner_display_name text,
  member_count bigint,
  expires_at timestamptz,
  remaining_uses integer,
  already_member boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_code text := lower(btrim(coalesce(invite_code, '')));
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  return query
  select
    servers.id,
    servers.name,
    servers.description,
    servers.icon_path,
    servers.banner_path,
    owners.display_name,
    (
      select count(*)
      from public.server_members as count_members
      where count_members.server_id = servers.id
    ),
    invites.expires_at,
    case
      when invites.max_uses is null then null
      else greatest(invites.max_uses - invites.uses_count, 0)
    end,
    exists (
      select 1
      from public.server_members as current_membership
      where current_membership.server_id = servers.id
        and current_membership.profile_id = auth.uid()
    )
  from public.server_invites as invites
  inner join public.servers
    on servers.id = invites.server_id
  inner join public.profiles as owners
    on owners.id = servers.owner_id
  where invites.code = normalized_code
    and invites.revoked_at is null
    and (invites.expires_at is null or invites.expires_at > now())
    and (invites.max_uses is null or invites.uses_count < invites.max_uses)
    and not exists (
      select 1
      from public.server_bans
      where server_bans.server_id = servers.id
        and server_bans.profile_id = auth.uid()
    );
end;
$$;

create or replace function public.join_server_by_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := lower(btrim(coalesce(invite_code, '')));
  invite_record public.server_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if normalized_code !~ '^[a-f0-9]{36}$' then
    raise exception using errcode = '22023', message = 'invalid_server_invite';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('server-invite:' || normalized_code, 0)
  );

  select invites.*
  into invite_record
  from public.server_invites as invites
  where invites.code = normalized_code
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'server_invite_not_found';
  end if;

  if invite_record.revoked_at is not null then
    raise exception using errcode = '42501', message = 'server_invite_revoked';
  end if;

  if invite_record.expires_at is not null
    and invite_record.expires_at <= now()
  then
    raise exception using errcode = '42501', message = 'server_invite_expired';
  end if;

  if invite_record.max_uses is not null
    and invite_record.uses_count >= invite_record.max_uses
  then
    raise exception using errcode = '42501', message = 'server_invite_exhausted';
  end if;

  if exists (
    select 1
    from public.server_bans
    where server_bans.server_id = invite_record.server_id
      and server_bans.profile_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'server_membership_banned';
  end if;

  if public.is_server_member(invite_record.server_id) then
    raise exception using errcode = '23505', message = 'already_server_member';
  end if;

  insert into public.server_members (server_id, profile_id)
  values (invite_record.server_id, auth.uid());

  update public.server_invites
  set uses_count = uses_count + 1
  where server_invites.id = invite_record.id;

  return invite_record.server_id;
end;
$$;

create or replace function public.revoke_server_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_record public.server_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select invites.*
  into invite_record
  from public.server_invites as invites
  where invites.id = target_invite_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'server_invite_not_found';
  end if;

  if invite_record.created_by <> auth.uid()
    and not public.is_server_owner(invite_record.server_id)
  then
    raise exception using errcode = '42501', message = 'cannot_revoke_server_invite';
  end if;

  update public.server_invites
  set revoked_at = now()
  where server_invites.id = target_invite_id
    and server_invites.revoked_at is null;
end;
$$;

create or replace function public.leave_server(target_server_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if public.is_server_owner(target_server_id) then
    raise exception using
      errcode = '42501',
      message = 'server_owner_must_transfer_or_delete';
  end if;

  delete from public.server_members
  where server_members.server_id = target_server_id
    and server_members.profile_id = auth.uid();

  if not found then
    raise exception using errcode = 'P0002', message = 'server_membership_not_found';
  end if;
end;
$$;

create or replace function public.transfer_server_ownership(
  target_server_id uuid,
  new_owner_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('server-owner:' || target_server_id::text, 0)
  );

  if not public.is_server_owner(target_server_id) then
    raise exception using errcode = '42501', message = 'server_owner_required';
  end if;

  if new_owner_profile_id = auth.uid() then
    raise exception using errcode = '22023', message = 'already_server_owner';
  end if;

  if not exists (
    select 1
    from public.server_members
    where server_members.server_id = target_server_id
      and server_members.profile_id = new_owner_profile_id
  ) then
    raise exception using errcode = '22023', message = 'new_owner_must_be_member';
  end if;

  if exists (
    select 1
    from public.server_bans
    where server_bans.server_id = target_server_id
      and server_bans.profile_id = new_owner_profile_id
  ) then
    raise exception using errcode = '42501', message = 'new_owner_is_banned';
  end if;

  update public.servers
  set
    owner_id = new_owner_profile_id,
    updated_at = now()
  where servers.id = target_server_id;
end;
$$;

create or replace function public.delete_server(
  target_server_id uuid,
  confirmation_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_server_name text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not public.is_server_owner(target_server_id) then
    raise exception using errcode = '42501', message = 'server_owner_required';
  end if;

  select servers.name
  into current_server_name
  from public.servers
  where servers.id = target_server_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'server_not_found';
  end if;

  if public.normalize_server_name(confirmation_name) <> current_server_name then
    raise exception using errcode = '22023', message = 'server_name_confirmation_mismatch';
  end if;

  delete from public.servers
  where servers.id = target_server_id;
end;
$$;

create or replace function public.can_view_presence(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() = target_profile_id
    or (
      exists (
        select 1
        from public.profile_settings
        where profile_settings.profile_id = target_profile_id
          and profile_settings.show_online_status
      )
      and (
        public.are_friends(target_profile_id)
        or exists (
          select 1
          from public.server_members as mine
          inner join public.server_members as theirs
            on theirs.server_id = mine.server_id
          where mine.profile_id = auth.uid()
            and theirs.profile_id = target_profile_id
        )
      )
    );
$$;

create or replace function public.get_public_profile_by_handle(target_handle text)
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  bio text,
  created_at timestamptz,
  favorite_spotify_url text,
  favorite_spotify_title text,
  relationship_status text,
  mutual_friend_count bigint,
  allow_friend_requests boolean,
  interest_labels text[],
  interest_category_labels text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_target text := public.normalize_handle(target_handle);
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  return query
  select
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    profiles.bio,
    profiles.created_at,
    profiles.favorite_spotify_url,
    profiles.favorite_spotify_title,
    public.get_connection_status(profiles.id),
    public.get_mutual_friend_count(profiles.id),
    settings.allow_friend_requests,
    case
      when settings.show_interests_on_profile
        and not settings.hide_all_interests
      then coalesce(interests_data.labels, '{}'::text[])
      else '{}'::text[]
    end,
    case
      when settings.show_interests_on_profile
        and not settings.hide_all_interests
      then coalesce(interests_data.category_labels, '{}'::text[])
      else '{}'::text[]
    end
  from public.profiles as profiles
  inner join public.profile_settings as settings
    on settings.profile_id = profiles.id
  left join lateral (
    select
      array_agg(interests.label order by categories.sort_order, interests.sort_order) as labels,
      array_agg(distinct categories.label order by categories.label) as category_labels
    from public.profile_interests
    inner join public.interests
      on interests.id = profile_interests.interest_id
    inner join public.interest_categories as categories
      on categories.id = interests.category_id
    where profile_interests.profile_id = profiles.id
  ) as interests_data on true
  where profiles.handle = normalized_target
    and not public.has_block_between(profiles.id)
    and (
      profiles.id = auth.uid()
      or settings.discoverable_by_search
      or public.are_friends(profiles.id)
      or exists (
        select 1
        from public.friend_requests
        where (
          friend_requests.sender_id = auth.uid()
          and friend_requests.receiver_id = profiles.id
        )
        or (
          friend_requests.sender_id = profiles.id
          and friend_requests.receiver_id = auth.uid()
        )
      )
      or exists (
        select 1
        from public.server_members as mine
        inner join public.server_members as theirs
          on theirs.server_id = mine.server_id
        where mine.profile_id = auth.uid()
          and theirs.profile_id = profiles.id
      )
    )
  limit 1;
end;
$$;

alter table public.servers enable row level security;
alter table public.servers force row level security;
alter table public.server_members enable row level security;
alter table public.server_members force row level security;
alter table public.server_roles enable row level security;
alter table public.server_roles force row level security;
alter table public.server_channels enable row level security;
alter table public.server_channels force row level security;
alter table public.server_invites enable row level security;
alter table public.server_invites force row level security;
alter table public.server_bans enable row level security;
alter table public.server_bans force row level security;

create policy servers_read_members
on public.servers
for select
to authenticated
using (public.is_server_member(id));

create policy server_members_read_same_server
on public.server_members
for select
to authenticated
using (public.is_server_member(server_id));

create policy server_roles_read_members
on public.server_roles
for select
to authenticated
using (public.is_server_member(server_id));

create policy server_channels_read_members
on public.server_channels
for select
to authenticated
using (public.is_server_member(server_id));

create policy server_invites_read_owner_or_creator
on public.server_invites
for select
to authenticated
using (
  public.is_server_owner(server_id)
  or created_by = (select auth.uid())
);

create policy server_bans_read_owner
on public.server_bans
for select
to authenticated
using (public.is_server_owner(server_id));

revoke all on table public.servers from anon, authenticated;
revoke all on table public.server_members from anon, authenticated;
revoke all on table public.server_roles from anon, authenticated;
revoke all on table public.server_channels from anon, authenticated;
revoke all on table public.server_invites from anon, authenticated;
revoke all on table public.server_bans from anon, authenticated;

grant select on table public.servers to authenticated;
grant select on table public.server_members to authenticated;
grant select on table public.server_roles to authenticated;
grant select on table public.server_channels to authenticated;
grant select on table public.server_invites to authenticated;
grant select on table public.server_bans to authenticated;

revoke all on function public.normalize_server_name(text) from public;
revoke all on function public.is_server_member(uuid) from public;
revoke all on function public.is_server_owner(uuid) from public;
revoke all on function public.create_server(text, text) from public;
revoke all on function public.get_my_servers() from public;
revoke all on function public.get_server_overview(uuid) from public;
revoke all on function public.get_server_members(uuid) from public;
revoke all on function public.update_server_settings(uuid, text, text, text, text) from public;
revoke all on function public.create_server_invite(uuid, integer, integer) from public;
revoke all on function public.get_server_invites(uuid) from public;
revoke all on function public.get_server_invite_preview(text) from public;
revoke all on function public.join_server_by_invite(text) from public;
revoke all on function public.revoke_server_invite(uuid) from public;
revoke all on function public.leave_server(uuid) from public;
revoke all on function public.transfer_server_ownership(uuid, uuid) from public;
revoke all on function public.delete_server(uuid, text) from public;
revoke all on function public.can_view_presence(uuid) from public;

grant execute on function public.normalize_server_name(text) to authenticated;
grant execute on function public.is_server_member(uuid) to authenticated;
grant execute on function public.is_server_owner(uuid) to authenticated;
grant execute on function public.create_server(text, text) to authenticated;
grant execute on function public.get_my_servers() to authenticated;
grant execute on function public.get_server_overview(uuid) to authenticated;
grant execute on function public.get_server_members(uuid) to authenticated;
grant execute on function public.update_server_settings(uuid, text, text, text, text)
to authenticated;
grant execute on function public.create_server_invite(uuid, integer, integer)
to authenticated;
grant execute on function public.get_server_invites(uuid) to authenticated;
grant execute on function public.get_server_invite_preview(text) to authenticated;
grant execute on function public.join_server_by_invite(text) to authenticated;
grant execute on function public.revoke_server_invite(uuid) to authenticated;
grant execute on function public.leave_server(uuid) to authenticated;
grant execute on function public.transfer_server_ownership(uuid, uuid) to authenticated;
grant execute on function public.delete_server(uuid, text) to authenticated;
grant execute on function public.can_view_presence(uuid) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'server-media',
  'server-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy crypt_server_media_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'server-media'
  and exists (
    select 1
    from public.servers
    where servers.id::text = (storage.foldername(name))[1]
      and servers.owner_id = (select auth.uid())
  )
  and name ~ '^[0-9a-f-]{36}/(icon|banner)-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
);

create policy crypt_server_media_delete_owner
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'server-media'
  and exists (
    select 1
    from public.servers
    where servers.id::text = (storage.foldername(name))[1]
      and servers.owner_id = (select auth.uid())
  )
);

do $$
begin
  alter publication supabase_realtime add table public.servers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.server_members;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.server_invites;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

comment on function public.create_server(text, text) is
  'Cria servidor privado, proprietário membro, cargo padrão e canal Conversa Geral atomicamente.';
comment on function public.join_server_by_invite(text) is
  'Valida convite, expiração, revogação, limite, banimento e duplicidade no backend.';
comment on function public.transfer_server_ownership(uuid, uuid) is
  'Transfere propriedade somente do proprietário atual para outro membro existente.';
comment on function public.delete_server(uuid, text) is
  'Exige propriedade e confirmação explícita pelo nome normalizado do servidor.';
