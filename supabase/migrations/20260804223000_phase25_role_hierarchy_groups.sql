set lock_timeout = '5s';
set statement_timeout = '90s';

-- Salva toda a hierarquia em uma única transação.
-- A lista recebida usa a ordem visual: cargo mais alto primeiro.
create or replace function public.reorder_server_roles(
  target_server_id uuid,
  ordered_role_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_role_ids uuid[] := coalesce(ordered_role_ids, '{}'::uuid[]);
  current_role_ids uuid[];
  caller_position integer;
  protected_role_ids uuid[];
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 16)
  ) then
    raise exception using errcode = '42501', message = 'manage_roles_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_server_id::text, 2501));

  select coalesce(
    array_agg(roles.id order by roles.position desc, roles.created_at, roles.id),
    '{}'::uuid[]
  )
  into current_role_ids
  from public.server_roles as roles
  where roles.server_id = target_server_id
    and not roles.is_default
    and not roles.is_system;

  if cardinality(safe_role_ids) <> cardinality(current_role_ids) then
    raise exception using errcode = '22023', message = 'invalid_role_order';
  end if;

  if exists (
    select 1
    from unnest(safe_role_ids) as submitted(role_id)
    group by submitted.role_id
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'duplicate_role_order';
  end if;

  if exists (
    select 1
    from unnest(safe_role_ids) as submitted(role_id)
    left join public.server_roles as roles
      on roles.id = submitted.role_id
      and roles.server_id = target_server_id
      and not roles.is_default
      and not roles.is_system
    where roles.id is null
  ) or exists (
    select 1
    from unnest(current_role_ids) as current_roles(role_id)
    where not current_roles.role_id = any(safe_role_ids)
  ) then
    raise exception using errcode = '22023', message = 'invalid_role_order';
  end if;

  caller_position := public.get_highest_server_role_position(target_server_id);

  if not public.is_server_owner(target_server_id) then
    select coalesce(
      array_agg(roles.id order by roles.position desc, roles.created_at, roles.id),
      '{}'::uuid[]
    )
    into protected_role_ids
    from public.server_roles as roles
    where roles.server_id = target_server_id
      and not roles.is_default
      and not roles.is_system
      and roles.position >= caller_position;

    if cardinality(protected_role_ids) > 0
      and protected_role_ids is distinct from
        safe_role_ids[1:cardinality(protected_role_ids)]
    then
      raise exception using errcode = '42501', message = 'role_hierarchy_required';
    end if;
  end if;

  with submitted_order as (
    select
      submitted.role_id,
      cardinality(safe_role_ids) - submitted.ordinal + 1 as next_position
    from unnest(safe_role_ids) with ordinality as submitted(role_id, ordinal)
  )
  update public.server_roles as roles
  set position = submitted_order.next_position
  from submitted_order
  where roles.server_id = target_server_id
    and roles.id = submitted_order.role_id;
end;
$$;

-- O proprietário pode atribuir cargos a si mesmo.
-- Gestores comuns não podem alterar o proprietário, a si próprios,
-- cargos iguais/superiores ou permissões que não possuam.
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
  requested_role_ids uuid[];
  caller_position integer;
  caller_permissions bigint;
  target_position integer;
  server_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

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

  select servers.owner_id
  into server_owner_id
  from public.servers
  where servers.id = target_server_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'server_not_found';
  end if;

  select coalesce(array_agg(distinct submitted.role_id), '{}'::uuid[])
  into requested_role_ids
  from unnest(coalesce(target_role_ids, '{}'::uuid[])) as submitted(role_id);

  if exists (
    select 1
    from unnest(requested_role_ids) as requested(role_id)
    left join public.server_roles as roles
      on roles.id = requested.role_id
      and roles.server_id = target_server_id
    where roles.id is null
      or roles.is_default
      or roles.is_system
  ) then
    raise exception using errcode = '22023', message = 'invalid_role_assignment';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_server_id::text, 2501));

  caller_position := public.get_highest_server_role_position(target_server_id);
  caller_permissions := public.get_my_server_permissions(target_server_id);
  target_position := public.get_highest_server_role_position(
    target_server_id,
    target_profile_id
  );

  if not public.is_server_owner(target_server_id) then
    if target_profile_id = server_owner_id then
      raise exception using errcode = '42501', message = 'cannot_manage_server_owner';
    end if;

    if target_profile_id = auth.uid() then
      raise exception using errcode = '42501', message = 'cannot_manage_own_roles';
    end if;

    if target_position >= caller_position then
      raise exception using errcode = '42501', message = 'role_hierarchy_required';
    end if;

    if exists (
      select 1
      from unnest(requested_role_ids) as requested(role_id)
      inner join public.server_roles as roles
        on roles.id = requested.role_id
      where roles.position >= caller_position
        or (roles.permissions | caller_permissions) <> caller_permissions
    ) then
      raise exception using errcode = '42501', message = 'role_hierarchy_required';
    end if;

    if exists (
      select 1
      from public.server_member_roles as current_roles
      inner join public.server_roles as roles
        on roles.id = current_roles.role_id
      where current_roles.server_id = target_server_id
        and current_roles.profile_id = target_profile_id
        and roles.position >= caller_position
    ) then
      raise exception using errcode = '42501', message = 'role_hierarchy_required';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      target_server_id::text || ':' || target_profile_id::text,
      2502
    )
  );

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
  from unnest(requested_role_ids) as requested(role_id);
end;
$$;

-- Retorna os IDs já na ordem da hierarquia: maior primeiro.
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
      array_agg(member_roles.role_id order by roles.position desc, roles.created_at)
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

revoke all on function public.reorder_server_roles(uuid, uuid[]) from public, anon;
revoke all on function public.set_server_member_roles(uuid, uuid, uuid[]) from public, anon;
revoke all on function public.get_server_member_roles(uuid) from public, anon;

grant execute on function public.reorder_server_roles(uuid, uuid[]) to authenticated;
grant execute on function public.set_server_member_roles(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.get_server_member_roles(uuid) to authenticated;

comment on function public.reorder_server_roles(uuid, uuid[]) is
  'Salva atomicamente a hierarquia visual dos cargos personalizados, do mais alto para o mais baixo.';
comment on function public.set_server_member_roles(uuid, uuid, uuid[]) is
  'Atribui cargos com proteção de hierarquia. O proprietário pode atribuir cargos a si mesmo.';
