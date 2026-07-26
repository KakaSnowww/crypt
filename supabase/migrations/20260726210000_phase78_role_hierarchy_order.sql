-- Phase 7–8 refinement: explicit role ordering and safe hierarchy movement.

with ranked_roles as (
  select
    roles.id,
    case
      when roles.is_default then 0
      else (
        count(*) filter (where not roles.is_default) over (
        partition by roles.server_id
        order by roles.position, roles.created_at, roles.id
        rows between unbounded preceding and current row
        )
      )::integer
    end as next_position
  from public.server_roles as roles
),
resolved_roles as (
  select
    ranked_roles.id,
    case
      when ranked_roles.next_position is null then 0
      else ranked_roles.next_position
    end as next_position
  from ranked_roles
)
update public.server_roles
set position = resolved_roles.next_position
from resolved_roles
where server_roles.id = resolved_roles.id;

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

  perform pg_advisory_xact_lock(hashtextextended(target_server_id::text, 78));

  if public.is_server_owner(target_server_id) then
    select coalesce(max(roles.position), 0) + 1
    into next_position
    from public.server_roles as roles
    where roles.server_id = target_server_id;
  else
    update public.server_roles
    set position = position + 1
    where server_roles.server_id = target_server_id
      and server_roles.position >= caller_position;

    next_position := caller_position;
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

create or replace function public.move_server_role(
  target_role_id uuid,
  direction integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_record public.server_roles%rowtype;
  adjacent_record public.server_roles%rowtype;
  caller_position integer;
  temporary_position integer;
begin
  if direction not in (-1, 1) then
    raise exception using errcode = '22023', message = 'invalid_move_direction';
  end if;

  select roles.*
  into role_record
  from public.server_roles as roles
  where roles.id = target_role_id
  for update;

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

  perform pg_advisory_xact_lock(hashtextextended(role_record.server_id::text, 78));

  select roles.*
  into adjacent_record
  from public.server_roles as roles
  where roles.server_id = role_record.server_id
    and not roles.is_system
    and not roles.is_default
    and roles.id <> role_record.id
    and (
      (direction = -1 and roles.position > role_record.position)
      or (direction = 1 and roles.position < role_record.position)
    )
    and (
      public.is_server_owner(role_record.server_id)
      or roles.position < caller_position
    )
  order by
    case when direction = -1 then roles.position end asc,
    case when direction = 1 then roles.position end desc
  limit 1
  for update;

  if not found then
    return;
  end if;

  select coalesce(max(roles.position), 0) + 1
  into temporary_position
  from public.server_roles as roles
  where roles.server_id = role_record.server_id;

  update public.server_roles
  set position = temporary_position
  where server_roles.id = role_record.id;

  update public.server_roles
  set position = role_record.position
  where server_roles.id = adjacent_record.id;

  update public.server_roles
  set position = adjacent_record.position
  where server_roles.id = role_record.id;
end;
$$;

revoke all on function public.move_server_role(uuid, integer) from public;
grant execute on function public.move_server_role(uuid, integer) to authenticated;
