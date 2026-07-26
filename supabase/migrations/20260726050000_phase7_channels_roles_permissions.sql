set lock_timeout = '5s';
set statement_timeout = '60s';

alter table public.server_roles
add column permissions bigint not null default 79744,
add column display_separately boolean not null default false,
add column updated_at timestamptz not null default now(),
add constraint server_roles_permissions_range
  check (permissions between 0 and 131071);

update public.server_roles
set permissions = 79744
where is_default;

create trigger server_roles_set_updated_at
before update on public.server_roles
for each row
execute function public.set_profile_updated_at();

create table public.server_categories (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint server_categories_name_length
    check (char_length(name) between 1 and 80),
  constraint server_categories_name_normalized
    check (
      name = public.normalize_server_name(name)
      and name !~ '[[:cntrl:]]'
      and normalized_name = lower(public.normalize_server_name(name))
    ),
  constraint server_categories_position_nonnegative
    check (position >= 0)
);

create unique index server_categories_name_idx
on public.server_categories (server_id, normalized_name);

create index server_categories_order_idx
on public.server_categories (server_id, position, created_at);

create trigger server_categories_set_updated_at
before update on public.server_categories
for each row
execute function public.set_profile_updated_at();

drop index public.server_channels_name_idx;

alter table public.server_channels
add column category_id uuid references public.server_categories (id) on delete set null,
add column icon text,
add column topic text,
add column slowmode_seconds integer not null default 0,
add column is_read_only boolean not null default false,
add column updated_at timestamptz not null default now(),
add constraint server_channels_icon_length
  check (icon is null or char_length(icon) between 1 and 16),
add constraint server_channels_topic_length
  check (topic is null or char_length(topic) <= 1024),
add constraint server_channels_slowmode_range
  check (slowmode_seconds between 0 and 21600),
add constraint server_channels_position_nonnegative
  check (position >= 0);

create unique index server_channels_name_scope_idx
on public.server_channels (
  server_id,
  coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
  normalized_name
);

create index server_channels_category_order_idx
on public.server_channels (server_id, category_id, position, created_at);

create trigger server_channels_set_updated_at
before update on public.server_channels
for each row
execute function public.set_profile_updated_at();

alter table public.server_roles
add constraint server_roles_server_id_id_unique unique (server_id, id);

alter table public.server_members
add constraint server_members_server_id_profile_id_unique unique (server_id, profile_id);

create table public.server_member_roles (
  server_id uuid not null,
  profile_id uuid not null,
  role_id uuid not null,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (server_id, profile_id, role_id),
  foreign key (server_id, profile_id)
    references public.server_members (server_id, profile_id)
    on delete cascade,
  foreign key (server_id, role_id)
    references public.server_roles (server_id, id)
    on delete cascade
);

create index server_member_roles_role_idx
on public.server_member_roles (server_id, role_id, profile_id);

create table public.server_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  category_id uuid references public.server_categories (id) on delete cascade,
  channel_id uuid references public.server_channels (id) on delete cascade,
  role_id uuid references public.server_roles (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  allow_permissions bigint not null default 0,
  deny_permissions bigint not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint server_permission_overrides_target
    check (num_nonnulls(category_id, channel_id) = 1),
  constraint server_permission_overrides_subject
    check (num_nonnulls(role_id, profile_id) = 1),
  constraint server_permission_overrides_masks
    check (
      allow_permissions between 0 and 131071
      and deny_permissions between 0 and 131071
      and (allow_permissions & deny_permissions) = 0
    )
);

create unique index server_permission_overrides_role_category_idx
on public.server_permission_overrides (category_id, role_id)
where category_id is not null and role_id is not null;

create unique index server_permission_overrides_role_channel_idx
on public.server_permission_overrides (channel_id, role_id)
where channel_id is not null and role_id is not null;

create unique index server_permission_overrides_profile_category_idx
on public.server_permission_overrides (category_id, profile_id)
where category_id is not null and profile_id is not null;

create unique index server_permission_overrides_profile_channel_idx
on public.server_permission_overrides (channel_id, profile_id)
where channel_id is not null and profile_id is not null;

create trigger server_permission_overrides_set_updated_at
before update on public.server_permission_overrides
for each row
execute function public.set_profile_updated_at();

comment on table public.server_categories is
  'Organização visual dos canais. O estado recolhido permanece como preferência local.';
comment on table public.server_member_roles is
  'Cargos personalizados atribuídos a membros; @everyone é implícito e não aparece nesta tabela.';
comment on table public.server_permission_overrides is
  'Sobrescritas por categoria ou canal, com precedência de categoria seguida por canal.';

alter table public.server_categories replica identity full;
alter table public.server_channels replica identity full;
alter table public.server_roles replica identity full;
alter table public.server_member_roles replica identity full;
alter table public.server_permission_overrides replica identity full;

create or replace function public.has_server_permission(
  target_server_id uuid,
  required_permission bigint,
  target_profile_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  combined_permissions bigint := 0;
begin
  if auth.uid() is null
    or target_profile_id is null
    or required_permission <= 0
  then
    return false;
  end if;

  if exists (
    select 1
    from public.servers
    where servers.id = target_server_id
      and servers.owner_id = target_profile_id
  ) then
    return true;
  end if;

  if not exists (
    select 1
    from public.server_members
    where server_members.server_id = target_server_id
      and server_members.profile_id = target_profile_id
  ) then
    return false;
  end if;

  select coalesce(bit_or(roles.permissions), 0)
  into combined_permissions
  from public.server_roles as roles
  where roles.server_id = target_server_id
    and (
      roles.is_default
      or exists (
        select 1
        from public.server_member_roles as member_roles
        where member_roles.server_id = target_server_id
          and member_roles.profile_id = target_profile_id
          and member_roles.role_id = roles.id
      )
    );

  if (combined_permissions & 1) = 1 then
    return true;
  end if;

  return (combined_permissions & required_permission) = required_permission;
end;
$$;

create or replace function public.has_server_permission(
  target_server_id uuid,
  required_permission bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_server_permission(
    target_server_id,
    required_permission,
    auth.uid()
  );
$$;

create or replace function public.get_effective_channel_permissions(
  target_channel_id uuid,
  target_profile_id uuid default auth.uid()
)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  channel_record public.server_channels%rowtype;
  effective_permissions bigint := 0;
  denied_permissions bigint := 0;
  allowed_permissions bigint := 0;
begin
  if auth.uid() is null or target_profile_id is null then
    return 0;
  end if;

  select channels.*
  into channel_record
  from public.server_channels as channels
  where channels.id = target_channel_id;

  if not found then
    return 0;
  end if;

  if exists (
    select 1
    from public.servers
    where servers.id = channel_record.server_id
      and servers.owner_id = target_profile_id
  ) then
    return 131071;
  end if;

  if not exists (
    select 1
    from public.server_members
    where server_members.server_id = channel_record.server_id
      and server_members.profile_id = target_profile_id
  ) then
    return 0;
  end if;

  select coalesce(bit_or(roles.permissions), 0)
  into effective_permissions
  from public.server_roles as roles
  where roles.server_id = channel_record.server_id
    and (
      roles.is_default
      or exists (
        select 1
        from public.server_member_roles as member_roles
        where member_roles.server_id = channel_record.server_id
          and member_roles.profile_id = target_profile_id
          and member_roles.role_id = roles.id
      )
    );

  if (effective_permissions & 1) = 1 then
    return 131071;
  end if;

  if channel_record.category_id is not null then
    select
      coalesce(bit_or(overrides.deny_permissions), 0),
      coalesce(bit_or(overrides.allow_permissions), 0)
    into denied_permissions, allowed_permissions
    from public.server_permission_overrides as overrides
    where overrides.category_id = channel_record.category_id
      and (
        overrides.profile_id = target_profile_id
        or overrides.role_id in (
          select roles.id
          from public.server_roles as roles
          where roles.server_id = channel_record.server_id
            and (
              roles.is_default
              or exists (
                select 1
                from public.server_member_roles as member_roles
                where member_roles.server_id = channel_record.server_id
                  and member_roles.profile_id = target_profile_id
                  and member_roles.role_id = roles.id
              )
            )
        )
      );

    effective_permissions :=
      (effective_permissions & ~denied_permissions) | allowed_permissions;
  end if;

  select
    coalesce(bit_or(overrides.deny_permissions), 0),
    coalesce(bit_or(overrides.allow_permissions), 0)
  into denied_permissions, allowed_permissions
  from public.server_permission_overrides as overrides
  where overrides.channel_id = target_channel_id
    and (
      overrides.profile_id = target_profile_id
      or overrides.role_id in (
        select roles.id
        from public.server_roles as roles
        where roles.server_id = channel_record.server_id
          and (
            roles.is_default
            or exists (
              select 1
              from public.server_member_roles as member_roles
              where member_roles.server_id = channel_record.server_id
                and member_roles.profile_id = target_profile_id
                and member_roles.role_id = roles.id
            )
          )
      )
    );

  return (effective_permissions & ~denied_permissions) | allowed_permissions;
end;
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
  select (
    public.get_effective_channel_permissions(
      target_channel_id,
      target_profile_id
    ) & 128
  ) = 128;
$$;

create or replace function public.can_send_message(
  target_channel_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    public.get_effective_channel_permissions(
      target_channel_id,
      target_profile_id
    ) & 384
  ) = 384
  and not coalesce(
    (
      select channels.is_read_only
      from public.server_channels as channels
      where channels.id = target_channel_id
    ),
    true
  );
$$;

create or replace function public.get_my_server_permissions(target_server_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_server_owner(target_server_id) then 131071
    else (
      select case
        when (combined.permissions & 1) = 1 then 131071
        else combined.permissions
      end
      from (
        select coalesce(bit_or(roles.permissions), 0) as permissions
        from public.server_roles as roles
        where roles.server_id = target_server_id
          and (
            roles.is_default
            or exists (
              select 1
              from public.server_member_roles as member_roles
              where member_roles.server_id = target_server_id
                and member_roles.profile_id = auth.uid()
                and member_roles.role_id = roles.id
            )
          )
      ) as combined
    )
  end;
$$;

create or replace function public.get_highest_server_role_position(
  target_server_id uuid,
  target_profile_id uuid default auth.uid()
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1
      from public.servers
      where servers.id = target_server_id
        and servers.owner_id = target_profile_id
    ) then 2147483647
    else coalesce(
      (
        select max(roles.position)
        from public.server_roles as roles
        where roles.server_id = target_server_id
          and (
            roles.is_default
            or exists (
              select 1
              from public.server_member_roles as member_roles
              where member_roles.server_id = target_server_id
                and member_roles.profile_id = target_profile_id
                and member_roles.role_id = roles.id
            )
          )
      ),
      0
    )
  end;
$$;

create or replace function public.get_server_categories(target_server_id uuid)
returns table (
  category_id uuid,
  category_name text,
  category_position integer,
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
  select categories.id, categories.name, categories.position, categories.created_at
  from public.server_categories as categories
  where categories.server_id = target_server_id
  order by categories.position, categories.created_at;
end;
$$;

create or replace function public.get_server_channels(target_server_id uuid)
returns table (
  channel_id uuid,
  channel_name text,
  normalized_name text,
  category_id uuid,
  channel_icon text,
  topic text,
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

create or replace function public.get_server_roles(target_server_id uuid)
returns table (
  role_id uuid,
  role_name text,
  color text,
  role_position integer,
  display_separately boolean,
  permissions bigint,
  is_default boolean,
  is_system boolean,
  member_count bigint
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
    roles.id,
    roles.name,
    roles.color,
    roles.position,
    roles.display_separately,
    roles.permissions,
    roles.is_default,
    roles.is_system,
    case
      when roles.is_default then (
        select count(*)
        from public.server_members
        where server_members.server_id = target_server_id
      )
      else (
        select count(*)
        from public.server_member_roles
        where server_member_roles.server_id = target_server_id
          and server_member_roles.role_id = roles.id
      )
    end
  from public.server_roles as roles
  where roles.server_id = target_server_id
  order by roles.position desc, roles.created_at;
end;
$$;

create or replace function public.get_server_member_roles(target_server_id uuid)
returns table (
  profile_id uuid,
  role_ids uuid[]
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
    members.profile_id,
    coalesce(
      array_agg(member_roles.role_id order by roles.position)
        filter (where member_roles.role_id is not null),
      '{}'::uuid[]
    )
  from public.server_members as members
  left join public.server_member_roles as member_roles
    on member_roles.server_id = members.server_id
    and member_roles.profile_id = members.profile_id
  left join public.server_roles as roles
    on roles.id = member_roles.role_id
  where members.server_id = target_server_id
  group by members.profile_id;
end;
$$;

create or replace function public.get_server_permission_overrides(target_server_id uuid)
returns table (
  override_id uuid,
  category_id uuid,
  channel_id uuid,
  role_id uuid,
  profile_id uuid,
  allow_permissions bigint,
  deny_permissions bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 4)
    or public.has_server_permission(target_server_id, 8)
  ) then
    raise exception using errcode = '42501', message = 'manage_channels_required';
  end if;

  return query
  select
    overrides.id,
    overrides.category_id,
    overrides.channel_id,
    overrides.role_id,
    overrides.profile_id,
    overrides.allow_permissions,
    overrides.deny_permissions
  from public.server_permission_overrides as overrides
  where overrides.server_id = target_server_id
  order by overrides.created_at;
end;
$$;

create or replace function public.create_server_category(
  target_server_id uuid,
  category_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := public.normalize_server_name(category_name);
  created_id uuid;
  next_position integer;
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 8)
  ) then
    raise exception using errcode = '42501', message = 'manage_categories_required';
  end if;

  if category_name ~ '[[:cntrl:]]'
    or char_length(normalized_name) not between 1 and 80
  then
    raise exception using errcode = '22023', message = 'invalid_category_name';
  end if;

  select coalesce(max(categories.position), -1) + 1
  into next_position
  from public.server_categories as categories
  where categories.server_id = target_server_id;

  insert into public.server_categories (
    server_id,
    name,
    normalized_name,
    position,
    created_by
  )
  values (
    target_server_id,
    normalized_name,
    lower(normalized_name),
    next_position,
    auth.uid()
  )
  returning id into created_id;

  return created_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'category_name_taken';
end;
$$;

create or replace function public.update_server_category(
  target_category_id uuid,
  category_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_server_id uuid;
  normalized_name text := public.normalize_server_name(category_name);
begin
  select categories.server_id
  into target_server_id
  from public.server_categories as categories
  where categories.id = target_category_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'category_not_found';
  end if;

  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 8)
  ) then
    raise exception using errcode = '42501', message = 'manage_categories_required';
  end if;

  if category_name ~ '[[:cntrl:]]'
    or char_length(normalized_name) not between 1 and 80
  then
    raise exception using errcode = '22023', message = 'invalid_category_name';
  end if;

  update public.server_categories
  set
    name = normalized_name,
    normalized_name = lower(normalized_name)
  where server_categories.id = target_category_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'category_name_taken';
end;
$$;

create or replace function public.move_server_category(
  target_category_id uuid,
  direction integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_record public.server_categories%rowtype;
  adjacent_record public.server_categories%rowtype;
begin
  if direction not in (-1, 1) then
    raise exception using errcode = '22023', message = 'invalid_move_direction';
  end if;

  select categories.*
  into category_record
  from public.server_categories as categories
  where categories.id = target_category_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'category_not_found';
  end if;

  if not (
    public.is_server_owner(category_record.server_id)
    or public.has_server_permission(category_record.server_id, 8)
  ) then
    raise exception using errcode = '42501', message = 'manage_categories_required';
  end if;

  select categories.*
  into adjacent_record
  from public.server_categories as categories
  where categories.server_id = category_record.server_id
    and (
      (direction = -1 and categories.position < category_record.position)
      or (direction = 1 and categories.position > category_record.position)
    )
  order by
    case when direction = -1 then categories.position end desc,
    case when direction = 1 then categories.position end asc
  limit 1
  for update;

  if found then
    update public.server_categories
    set position = case
      when id = category_record.id then adjacent_record.position
      when id = adjacent_record.id then category_record.position
      else position
    end
    where id in (category_record.id, adjacent_record.id);
  end if;
end;
$$;

create or replace function public.delete_server_category(target_category_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_server_id uuid;
begin
  select categories.server_id
  into target_server_id
  from public.server_categories as categories
  where categories.id = target_category_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'category_not_found';
  end if;

  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 8)
  ) then
    raise exception using errcode = '42501', message = 'manage_categories_required';
  end if;

  delete from public.server_categories
  where server_categories.id = target_category_id;
end;
$$;

create or replace function public.create_server_channel(
  target_server_id uuid,
  channel_name text,
  target_category_id uuid default null,
  channel_icon text default null,
  channel_topic text default null,
  channel_slowmode_seconds integer default 0,
  channel_is_read_only boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := public.normalize_server_name(channel_name);
  normalized_icon text := nullif(btrim(coalesce(channel_icon, '')), '');
  normalized_topic text := nullif(btrim(coalesce(channel_topic, '')), '');
  created_id uuid;
  next_position integer;
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 4)
  ) then
    raise exception using errcode = '42501', message = 'manage_channels_required';
  end if;

  if channel_name ~ '[[:cntrl:]]'
    or char_length(normalized_name) not between 1 and 80
  then
    raise exception using errcode = '22023', message = 'invalid_channel_name';
  end if;

  if normalized_icon is not null and char_length(normalized_icon) > 16 then
    raise exception using errcode = '22023', message = 'invalid_channel_icon';
  end if;

  if normalized_topic is not null and char_length(normalized_topic) > 1024 then
    raise exception using errcode = '22023', message = 'invalid_channel_topic';
  end if;

  if channel_slowmode_seconds not between 0 and 21600 then
    raise exception using errcode = '22023', message = 'invalid_channel_slowmode';
  end if;

  if target_category_id is not null
    and not exists (
      select 1
      from public.server_categories
      where server_categories.id = target_category_id
        and server_categories.server_id = target_server_id
    )
  then
    raise exception using errcode = '22023', message = 'category_server_mismatch';
  end if;

  select coalesce(max(channels.position), -1) + 1
  into next_position
  from public.server_channels as channels
  where channels.server_id = target_server_id
    and channels.category_id is not distinct from target_category_id;

  insert into public.server_channels (
    server_id,
    category_id,
    name,
    normalized_name,
    icon,
    topic,
    position,
    slowmode_seconds,
    is_read_only,
    created_by
  )
  values (
    target_server_id,
    target_category_id,
    normalized_name,
    lower(normalized_name),
    normalized_icon,
    normalized_topic,
    next_position,
    channel_slowmode_seconds,
    channel_is_read_only,
    auth.uid()
  )
  returning id into created_id;

  return created_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'channel_name_taken_in_category';
end;
$$;

create or replace function public.update_server_channel(
  target_channel_id uuid,
  channel_name text,
  target_category_id uuid,
  channel_icon text default null,
  channel_topic text default null,
  channel_slowmode_seconds integer default 0,
  channel_is_read_only boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel_record public.server_channels%rowtype;
  normalized_name text := public.normalize_server_name(channel_name);
  normalized_icon text := nullif(btrim(coalesce(channel_icon, '')), '');
  normalized_topic text := nullif(btrim(coalesce(channel_topic, '')), '');
begin
  select channels.*
  into channel_record
  from public.server_channels as channels
  where channels.id = target_channel_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'channel_not_found';
  end if;

  if not (
    public.is_server_owner(channel_record.server_id)
    or public.has_server_permission(channel_record.server_id, 4)
  ) then
    raise exception using errcode = '42501', message = 'manage_channels_required';
  end if;

  if channel_name ~ '[[:cntrl:]]'
    or char_length(normalized_name) not between 1 and 80
    or (normalized_icon is not null and char_length(normalized_icon) > 16)
    or (normalized_topic is not null and char_length(normalized_topic) > 1024)
    or channel_slowmode_seconds not between 0 and 21600
  then
    raise exception using errcode = '22023', message = 'invalid_channel_settings';
  end if;

  if target_category_id is not null
    and not exists (
      select 1
      from public.server_categories
      where server_categories.id = target_category_id
        and server_categories.server_id = channel_record.server_id
    )
  then
    raise exception using errcode = '22023', message = 'category_server_mismatch';
  end if;

  update public.server_channels
  set
    category_id = target_category_id,
    name = normalized_name,
    normalized_name = lower(normalized_name),
    icon = normalized_icon,
    topic = normalized_topic,
    slowmode_seconds = channel_slowmode_seconds,
    is_read_only = channel_is_read_only
  where server_channels.id = target_channel_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'channel_name_taken_in_category';
end;
$$;

create or replace function public.move_server_channel(
  target_channel_id uuid,
  direction integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel_record public.server_channels%rowtype;
  adjacent_record public.server_channels%rowtype;
begin
  if direction not in (-1, 1) then
    raise exception using errcode = '22023', message = 'invalid_move_direction';
  end if;

  select channels.*
  into channel_record
  from public.server_channels as channels
  where channels.id = target_channel_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'channel_not_found';
  end if;

  if not (
    public.is_server_owner(channel_record.server_id)
    or public.has_server_permission(channel_record.server_id, 4)
  ) then
    raise exception using errcode = '42501', message = 'manage_channels_required';
  end if;

  select channels.*
  into adjacent_record
  from public.server_channels as channels
  where channels.server_id = channel_record.server_id
    and channels.category_id is not distinct from channel_record.category_id
    and (
      (direction = -1 and channels.position < channel_record.position)
      or (direction = 1 and channels.position > channel_record.position)
    )
  order by
    case when direction = -1 then channels.position end desc,
    case when direction = 1 then channels.position end asc
  limit 1
  for update;

  if found then
    update public.server_channels
    set position = case
      when id = channel_record.id then adjacent_record.position
      when id = adjacent_record.id then channel_record.position
      else position
    end
    where id in (channel_record.id, adjacent_record.id);
  end if;
end;
$$;

create or replace function public.delete_server_channel(target_channel_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel_record public.server_channels%rowtype;
begin
  select channels.*
  into channel_record
  from public.server_channels as channels
  where channels.id = target_channel_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'channel_not_found';
  end if;

  if not (
    public.is_server_owner(channel_record.server_id)
    or public.has_server_permission(channel_record.server_id, 4)
  ) then
    raise exception using errcode = '42501', message = 'manage_channels_required';
  end if;

  if (
    select count(*)
    from public.server_channels
    where server_channels.server_id = channel_record.server_id
  ) <= 1 then
    raise exception using errcode = '22023', message = 'server_requires_one_channel';
  end if;

  delete from public.server_channels
  where server_channels.id = target_channel_id;
end;
$$;

create or replace function public.create_server_role(
  target_server_id uuid,
  role_name text,
  role_color text,
  role_permissions bigint,
  role_display_separately boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := public.normalize_server_name(role_name);
  normalized_color text := upper(btrim(role_color));
  next_position integer;
  created_id uuid;
  caller_position integer;
  caller_permissions bigint;
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 16)
  ) then
    raise exception using errcode = '42501', message = 'manage_roles_required';
  end if;

  if role_name ~ '[[:cntrl:]]'
    or char_length(normalized_name) not between 1 and 64
    or normalized_color !~ '^#[0-9A-F]{6}$'
    or role_permissions not between 0 and 131071
  then
    raise exception using errcode = '22023', message = 'invalid_role_settings';
  end if;

  caller_position := public.get_highest_server_role_position(target_server_id);
  caller_permissions := public.get_my_server_permissions(target_server_id);

  if not public.is_server_owner(target_server_id)
    and (
      caller_position <= 0
      or (role_permissions | caller_permissions) <> caller_permissions
    )
  then
    raise exception using errcode = '42501', message = 'role_hierarchy_required';
  end if;

  if public.is_server_owner(target_server_id) then
    select coalesce(max(roles.position), 0) + 1
    into next_position
    from public.server_roles as roles
    where roles.server_id = target_server_id;
  else
    next_position := caller_position - 1;
  end if;

  insert into public.server_roles (
    server_id,
    name,
    color,
    position,
    display_separately,
    permissions
  )
  values (
    target_server_id,
    normalized_name,
    normalized_color,
    next_position,
    role_display_separately,
    role_permissions
  )
  returning id into created_id;

  return created_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'role_name_taken';
end;
$$;

create or replace function public.update_server_role(
  target_role_id uuid,
  role_name text,
  role_color text,
  role_permissions bigint,
  role_display_separately boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_record public.server_roles%rowtype;
  normalized_name text := public.normalize_server_name(role_name);
  normalized_color text := upper(btrim(role_color));
  caller_position integer;
  caller_permissions bigint;
begin
  select roles.*
  into role_record
  from public.server_roles as roles
  where roles.id = target_role_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'role_not_found';
  end if;

  if not (
    public.is_server_owner(role_record.server_id)
    or public.has_server_permission(role_record.server_id, 16)
  ) then
    raise exception using errcode = '42501', message = 'manage_roles_required';
  end if;

  caller_position := public.get_highest_server_role_position(role_record.server_id);
  caller_permissions := public.get_my_server_permissions(role_record.server_id);

  if not public.is_server_owner(role_record.server_id)
    and (
      role_record.position >= caller_position
      or (role_permissions | caller_permissions) <> caller_permissions
    )
  then
    raise exception using errcode = '42501', message = 'role_hierarchy_required';
  end if;

  if role_record.is_system and normalized_name <> role_record.name then
    raise exception using errcode = '42501', message = 'system_role_name_locked';
  end if;

  if role_name ~ '[[:cntrl:]]'
    or char_length(normalized_name) not between 1 and 64
    or normalized_color !~ '^#[0-9A-F]{6}$'
    or role_permissions not between 0 and 131071
  then
    raise exception using errcode = '22023', message = 'invalid_role_settings';
  end if;

  update public.server_roles
  set
    name = normalized_name,
    color = normalized_color,
    permissions = role_permissions,
    display_separately = role_display_separately
  where server_roles.id = target_role_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'role_name_taken';
end;
$$;

create or replace function public.delete_server_role(target_role_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_record public.server_roles%rowtype;
  caller_position integer;
begin
  select roles.*
  into role_record
  from public.server_roles as roles
  where roles.id = target_role_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'role_not_found';
  end if;

  if role_record.is_system or role_record.is_default then
    raise exception using errcode = '42501', message = 'system_role_locked';
  end if;

  if not (
    public.is_server_owner(role_record.server_id)
    or public.has_server_permission(role_record.server_id, 16)
  ) then
    raise exception using errcode = '42501', message = 'manage_roles_required';
  end if;

  caller_position := public.get_highest_server_role_position(role_record.server_id);

  if not public.is_server_owner(role_record.server_id)
    and role_record.position >= caller_position
  then
    raise exception using errcode = '42501', message = 'role_hierarchy_required';
  end if;

  delete from public.server_roles
  where server_roles.id = target_role_id;
end;
$$;

create or replace function public.set_server_member_roles(
  target_server_id uuid,
  target_profile_id uuid,
  target_role_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_position integer;
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 16)
  ) then
    raise exception using errcode = '42501', message = 'manage_roles_required';
  end if;

  if not exists (
    select 1
    from public.server_members
    where server_members.server_id = target_server_id
      and server_members.profile_id = target_profile_id
  ) then
    raise exception using errcode = '22023', message = 'role_member_required';
  end if;

  if target_profile_id = (
    select servers.owner_id
    from public.servers
    where servers.id = target_server_id
  ) and not public.is_server_owner(target_server_id) then
    raise exception using errcode = '42501', message = 'cannot_manage_server_owner';
  end if;

  caller_position := public.get_highest_server_role_position(target_server_id);

  if not public.is_server_owner(target_server_id)
    and (
      exists (
        select 1
        from public.server_member_roles as current_roles
        inner join public.server_roles as roles
          on roles.id = current_roles.role_id
        where current_roles.server_id = target_server_id
          and current_roles.profile_id = target_profile_id
          and roles.position >= caller_position
      )
      or exists (
        select 1
        from unnest(coalesce(target_role_ids, '{}'::uuid[])) as requested(role_id)
        inner join public.server_roles as roles
          on roles.id = requested.role_id
        where roles.position >= caller_position
      )
    )
  then
    raise exception using errcode = '42501', message = 'role_hierarchy_required';
  end if;

  if exists (
    select 1
    from unnest(coalesce(target_role_ids, '{}'::uuid[])) as requested(role_id)
    left join public.server_roles as roles
      on roles.id = requested.role_id
      and roles.server_id = target_server_id
    where roles.id is null
      or roles.is_default
      or roles.is_system
  ) then
    raise exception using errcode = '22023', message = 'invalid_role_assignment';
  end if;

  delete from public.server_member_roles
  where server_member_roles.server_id = target_server_id
    and server_member_roles.profile_id = target_profile_id;

  insert into public.server_member_roles (
    server_id,
    profile_id,
    role_id,
    assigned_by
  )
  select
    target_server_id,
    target_profile_id,
    requested.role_id,
    auth.uid()
  from (
    select distinct unnest(coalesce(target_role_ids, '{}'::uuid[])) as role_id
  ) as requested;
end;
$$;

create or replace function public.set_server_permission_override(
  target_server_id uuid,
  target_kind text,
  target_id uuid,
  target_role_id uuid,
  allowed_permissions bigint,
  denied_permissions bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  caller_position integer;
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 4)
    or public.has_server_permission(target_server_id, 8)
  ) then
    raise exception using errcode = '42501', message = 'manage_channels_required';
  end if;

  if target_kind not in ('category', 'channel')
    or allowed_permissions not between 0 and 131071
    or denied_permissions not between 0 and 131071
    or (allowed_permissions & denied_permissions) <> 0
  then
    raise exception using errcode = '22023', message = 'invalid_permission_override';
  end if;

  if not exists (
    select 1
    from public.server_roles
    where server_roles.id = target_role_id
      and server_roles.server_id = target_server_id
  ) then
    raise exception using errcode = '22023', message = 'override_role_server_mismatch';
  end if;

  caller_position := public.get_highest_server_role_position(target_server_id);

  if not public.is_server_owner(target_server_id)
    and (
      select roles.position >= caller_position
      from public.server_roles as roles
      where roles.id = target_role_id
    )
  then
    raise exception using errcode = '42501', message = 'role_hierarchy_required';
  end if;

  if target_kind = 'category' then
    if not exists (
      select 1
      from public.server_categories
      where server_categories.id = target_id
        and server_categories.server_id = target_server_id
    ) then
      raise exception using errcode = '22023', message = 'override_target_server_mismatch';
    end if;

    insert into public.server_permission_overrides (
      server_id,
      category_id,
      role_id,
      allow_permissions,
      deny_permissions,
      created_by
    )
    values (
      target_server_id,
      target_id,
      target_role_id,
      allowed_permissions,
      denied_permissions,
      auth.uid()
    )
    on conflict (category_id, role_id)
      where category_id is not null and role_id is not null
    do update
    set
      allow_permissions = excluded.allow_permissions,
      deny_permissions = excluded.deny_permissions,
      updated_at = now()
    returning id into saved_id;
  else
    if not exists (
      select 1
      from public.server_channels
      where server_channels.id = target_id
        and server_channels.server_id = target_server_id
    ) then
      raise exception using errcode = '22023', message = 'override_target_server_mismatch';
    end if;

    insert into public.server_permission_overrides (
      server_id,
      channel_id,
      role_id,
      allow_permissions,
      deny_permissions,
      created_by
    )
    values (
      target_server_id,
      target_id,
      target_role_id,
      allowed_permissions,
      denied_permissions,
      auth.uid()
    )
    on conflict (channel_id, role_id)
      where channel_id is not null and role_id is not null
    do update
    set
      allow_permissions = excluded.allow_permissions,
      deny_permissions = excluded.deny_permissions,
      updated_at = now()
    returning id into saved_id;
  end if;

  return saved_id;
end;
$$;

create or replace function public.delete_server_permission_override(target_override_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_server_id uuid;
  target_role_id uuid;
begin
  select overrides.server_id, overrides.role_id
  into target_server_id, target_role_id
  from public.server_permission_overrides as overrides
  where overrides.id = target_override_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'permission_override_not_found';
  end if;

  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 4)
    or public.has_server_permission(target_server_id, 8)
  ) then
    raise exception using errcode = '42501', message = 'manage_channels_required';
  end if;

  if not public.is_server_owner(target_server_id)
    and (
      select roles.position >= public.get_highest_server_role_position(target_server_id)
      from public.server_roles as roles
      where roles.id = target_role_id
    )
  then
    raise exception using errcode = '42501', message = 'role_hierarchy_required';
  end if;

  delete from public.server_permission_overrides
  where server_permission_overrides.id = target_override_id;
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

  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 32)
    or public.has_server_permission(target_server_id, 65536)
  ) then
    raise exception using errcode = '42501', message = 'create_invites_required';
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

alter table public.server_categories enable row level security;
alter table public.server_categories force row level security;
alter table public.server_member_roles enable row level security;
alter table public.server_member_roles force row level security;
alter table public.server_permission_overrides enable row level security;
alter table public.server_permission_overrides force row level security;

drop policy if exists server_channels_read_members on public.server_channels;

create policy server_categories_read_members
on public.server_categories
for select
to authenticated
using (public.is_server_member(server_id));

create policy server_channels_read_visible
on public.server_channels
for select
to authenticated
using (public.can_view_channel(id));

create policy server_member_roles_read_same_server
on public.server_member_roles
for select
to authenticated
using (public.is_server_member(server_id));

create policy server_permission_overrides_read_managers
on public.server_permission_overrides
for select
to authenticated
using (
  public.is_server_owner(server_id)
  or public.has_server_permission(server_id, 4)
  or public.has_server_permission(server_id, 8)
);

revoke all on table public.server_categories from anon, authenticated;
revoke all on table public.server_member_roles from anon, authenticated;
revoke all on table public.server_permission_overrides from anon, authenticated;

grant select on table public.server_categories to authenticated;
grant select on table public.server_member_roles to authenticated;
grant select on table public.server_permission_overrides to authenticated;

revoke all on function public.has_server_permission(uuid, bigint, uuid) from public;
revoke all on function public.has_server_permission(uuid, bigint) from public;
revoke all on function public.get_effective_channel_permissions(uuid, uuid) from public;
revoke all on function public.can_view_channel(uuid, uuid) from public;
revoke all on function public.can_send_message(uuid, uuid) from public;
revoke all on function public.get_my_server_permissions(uuid) from public;
revoke all on function public.get_highest_server_role_position(uuid, uuid) from public;
revoke all on function public.get_server_categories(uuid) from public;
revoke all on function public.get_server_channels(uuid) from public;
revoke all on function public.get_server_roles(uuid) from public;
revoke all on function public.get_server_member_roles(uuid) from public;
revoke all on function public.get_server_permission_overrides(uuid) from public;
revoke all on function public.create_server_category(uuid, text) from public;
revoke all on function public.update_server_category(uuid, text) from public;
revoke all on function public.move_server_category(uuid, integer) from public;
revoke all on function public.delete_server_category(uuid) from public;
revoke all on function public.create_server_channel(
  uuid, text, uuid, text, text, integer, boolean
) from public;
revoke all on function public.update_server_channel(
  uuid, text, uuid, text, text, integer, boolean
) from public;
revoke all on function public.move_server_channel(uuid, integer) from public;
revoke all on function public.delete_server_channel(uuid) from public;
revoke all on function public.create_server_role(
  uuid, text, text, bigint, boolean
) from public;
revoke all on function public.update_server_role(
  uuid, text, text, bigint, boolean
) from public;
revoke all on function public.delete_server_role(uuid) from public;
revoke all on function public.set_server_member_roles(uuid, uuid, uuid[]) from public;
revoke all on function public.set_server_permission_override(
  uuid, text, uuid, uuid, bigint, bigint
) from public;
revoke all on function public.delete_server_permission_override(uuid) from public;

grant execute on function public.has_server_permission(uuid, bigint, uuid) to authenticated;
grant execute on function public.has_server_permission(uuid, bigint) to authenticated;
grant execute on function public.get_effective_channel_permissions(uuid, uuid) to authenticated;
grant execute on function public.can_view_channel(uuid, uuid) to authenticated;
grant execute on function public.can_send_message(uuid, uuid) to authenticated;
grant execute on function public.get_my_server_permissions(uuid) to authenticated;
grant execute on function public.get_server_categories(uuid) to authenticated;
grant execute on function public.get_server_channels(uuid) to authenticated;
grant execute on function public.get_server_roles(uuid) to authenticated;
grant execute on function public.get_server_member_roles(uuid) to authenticated;
grant execute on function public.get_server_permission_overrides(uuid) to authenticated;
grant execute on function public.create_server_category(uuid, text) to authenticated;
grant execute on function public.update_server_category(uuid, text) to authenticated;
grant execute on function public.move_server_category(uuid, integer) to authenticated;
grant execute on function public.delete_server_category(uuid) to authenticated;
grant execute on function public.create_server_channel(
  uuid, text, uuid, text, text, integer, boolean
) to authenticated;
grant execute on function public.update_server_channel(
  uuid, text, uuid, text, text, integer, boolean
) to authenticated;
grant execute on function public.move_server_channel(uuid, integer) to authenticated;
grant execute on function public.delete_server_channel(uuid) to authenticated;
grant execute on function public.create_server_role(
  uuid, text, text, bigint, boolean
) to authenticated;
grant execute on function public.update_server_role(
  uuid, text, text, bigint, boolean
) to authenticated;
grant execute on function public.delete_server_role(uuid) to authenticated;
grant execute on function public.set_server_member_roles(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.set_server_permission_override(
  uuid, text, uuid, uuid, bigint, bigint
) to authenticated;
grant execute on function public.delete_server_permission_override(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.server_categories;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.server_roles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.server_member_roles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.server_channels;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.server_permission_overrides;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
