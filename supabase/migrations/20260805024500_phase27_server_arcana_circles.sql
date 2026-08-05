set lock_timeout = '5s';
set statement_timeout = '90s';

do $$
begin
  if to_regclass('public.arcana_subscriptions') is null
    or to_regclass('public.server_arcana_runes') is null
  then
    raise exception using
      errcode = '55000',
      message = 'arcana_base_required';
  end if;
end;
$$;

alter table public.servers
add column if not exists arcana_gradient_start text,
add column if not exists arcana_gradient_end text,
add column if not exists arcana_gradient_angle smallint not null default 135;

alter table public.servers
drop constraint if exists servers_arcana_gradient_start_check,
drop constraint if exists servers_arcana_gradient_end_check,
drop constraint if exists servers_arcana_gradient_pair_check,
drop constraint if exists servers_arcana_gradient_angle_check;

alter table public.servers
add constraint servers_arcana_gradient_start_check
  check (
    arcana_gradient_start is null
    or arcana_gradient_start ~ '^#[0-9A-Fa-f]{6}$'
  ),
add constraint servers_arcana_gradient_end_check
  check (
    arcana_gradient_end is null
    or arcana_gradient_end ~ '^#[0-9A-Fa-f]{6}$'
  ),
add constraint servers_arcana_gradient_pair_check
  check (
    (arcana_gradient_start is null) =
    (arcana_gradient_end is null)
  ),
add constraint servers_arcana_gradient_angle_check
  check (arcana_gradient_angle between 0 and 360);

create or replace function public.calculate_server_arcana_status(
  target_server_id uuid
)
returns table(
  rune_count bigint,
  contributor_count bigint,
  circle_level integer,
  circle_name text,
  circle_color text,
  current_threshold integer,
  next_level_runes integer,
  runes_to_next_level integer,
  attachment_limit_bytes integer,
  animated_media_unlocked boolean,
  custom_gradient_unlocked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with active_runes as (
    select runes.profile_id
    from public.server_arcana_runes as runes
    where runes.server_id = target_server_id
      and public.has_active_arcana(runes.profile_id)
  ),
  totals as (
    select
      count(*)::bigint as rune_count,
      count(distinct profile_id)::bigint as contributor_count
    from active_runes
  ),
  level_data as (
    select
      totals.rune_count,
      totals.contributor_count,
      case
        when totals.rune_count >= 15 then 3
        when totals.rune_count >= 7 then 2
        when totals.rune_count >= 3 then 1
        else 0
      end as circle_level
    from totals
  )
  select
    level_data.rune_count,
    level_data.contributor_count,
    level_data.circle_level,
    case level_data.circle_level
      when 3 then 'Círculo Arcano'
      when 2 then 'Círculo Elevado'
      when 1 then 'Círculo Desperto'
      else 'Sem Círculo'
    end,
    case level_data.circle_level
      when 3 then '#D946EF'
      when 2 then '#6366F1'
      when 1 then '#8B5CF6'
      else '#64748B'
    end,
    case level_data.circle_level
      when 3 then 15
      when 2 then 7
      when 1 then 3
      else 0
    end,
    case level_data.circle_level
      when 3 then null
      when 2 then 15
      when 1 then 7
      else 3
    end,
    case level_data.circle_level
      when 3 then 0
      when 2 then greatest(0, 15 - level_data.rune_count)::integer
      when 1 then greatest(0, 7 - level_data.rune_count)::integer
      else greatest(0, 3 - level_data.rune_count)::integer
    end,
    case level_data.circle_level
      when 3 then 52428800
      when 2 then 26214400
      else 5242880
    end,
    level_data.circle_level >= 1,
    level_data.circle_level >= 2
  from level_data;
$$;

revoke all on function public.calculate_server_arcana_status(uuid)
from public, anon, authenticated;

drop function if exists public.get_server_arcana_status(uuid);

create function public.get_server_arcana_status(
  target_server_id uuid
)
returns table(
  server_id uuid,
  rune_count bigint,
  contributor_count bigint,
  circle_level integer,
  circle_name text,
  circle_color text,
  current_threshold integer,
  next_level_runes integer,
  runes_to_next_level integer,
  attachment_limit_bytes integer,
  animated_media_unlocked boolean,
  custom_gradient_unlocked boolean,
  gradient_start text,
  gradient_end text,
  gradient_angle smallint
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
      message = 'server_access_denied';
  end if;

  return query
  select
    servers.id,
    metrics.rune_count,
    metrics.contributor_count,
    metrics.circle_level,
    metrics.circle_name,
    metrics.circle_color,
    metrics.current_threshold,
    metrics.next_level_runes,
    metrics.runes_to_next_level,
    metrics.attachment_limit_bytes,
    metrics.animated_media_unlocked,
    metrics.custom_gradient_unlocked,
    case
      when metrics.custom_gradient_unlocked
      then servers.arcana_gradient_start
      else null
    end,
    case
      when metrics.custom_gradient_unlocked
      then servers.arcana_gradient_end
      else null
    end,
    servers.arcana_gradient_angle
  from public.servers
  cross join lateral
    public.calculate_server_arcana_status(servers.id) as metrics
  where servers.id = target_server_id;
end;
$$;

create or replace function public.get_my_server_arcana_statuses()
returns table(
  server_id uuid,
  rune_count bigint,
  contributor_count bigint,
  circle_level integer,
  circle_name text,
  circle_color text,
  current_threshold integer,
  next_level_runes integer,
  runes_to_next_level integer,
  attachment_limit_bytes integer,
  animated_media_unlocked boolean,
  custom_gradient_unlocked boolean,
  gradient_start text,
  gradient_end text,
  gradient_angle smallint
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
    servers.id,
    metrics.rune_count,
    metrics.contributor_count,
    metrics.circle_level,
    metrics.circle_name,
    metrics.circle_color,
    metrics.current_threshold,
    metrics.next_level_runes,
    metrics.runes_to_next_level,
    metrics.attachment_limit_bytes,
    metrics.animated_media_unlocked,
    metrics.custom_gradient_unlocked,
    case
      when metrics.custom_gradient_unlocked
      then servers.arcana_gradient_start
      else null
    end,
    case
      when metrics.custom_gradient_unlocked
      then servers.arcana_gradient_end
      else null
    end,
    servers.arcana_gradient_angle
  from public.server_members as memberships
  inner join public.servers
    on servers.id = memberships.server_id
  cross join lateral
    public.calculate_server_arcana_status(servers.id) as metrics
  where memberships.profile_id = auth.uid()
  order by memberships.joined_at, servers.name;
end;
$$;

create or replace function public.set_server_arcana_gradient(
  target_server_id uuid,
  gradient_start text,
  gradient_end text,
  gradient_angle smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_level integer;
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

  select metrics.circle_level
  into current_level
  from public.calculate_server_arcana_status(target_server_id) as metrics;

  if coalesce(current_level, 0) < 2 then
    raise exception using
      errcode = '42501',
      message = 'server_arcana_gradient_required';
  end if;

  if gradient_start !~ '^#[0-9A-Fa-f]{6}$'
    or gradient_end !~ '^#[0-9A-Fa-f]{6}$'
    or gradient_angle not between 0 and 360
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_server_arcana_gradient';
  end if;

  update public.servers
  set
    arcana_gradient_start = upper(gradient_start),
    arcana_gradient_end = upper(gradient_end),
    arcana_gradient_angle = gradient_angle,
    updated_at = now()
  where servers.id = target_server_id;
end;
$$;

create or replace function public.clear_server_arcana_gradient(
  target_server_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  update public.servers
  set
    arcana_gradient_start = null,
    arcana_gradient_end = null,
    arcana_gradient_angle = 135,
    updated_at = now()
  where servers.id = target_server_id;
end;
$$;

create or replace function public.get_my_attachment_limit(
  target_server_id uuid
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  personal_limit integer := 5242880;
  server_limit integer := 5242880;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if public.has_active_arcana(auth.uid()) then
    personal_limit := 26214400;
  end if;

  if target_server_id is not null
    and public.is_server_member(target_server_id)
  then
    select metrics.attachment_limit_bytes
    into server_limit
    from public.calculate_server_arcana_status(target_server_id) as metrics;
  end if;

  return greatest(
    personal_limit,
    coalesce(server_limit, 5242880)
  );
end;
$$;

create or replace function public.get_my_attachment_limit()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_my_attachment_limit(null::uuid);
$$;

alter table public.message_attachments
drop constraint if exists message_attachments_size;

alter table public.message_attachments
add constraint message_attachments_size
check (size_bytes between 1 and 52428800);

update storage.buckets
set file_size_limit = 52428800
where id = 'message-attachments';

do $$
declare
  function_record record;
  definition text;
begin
  for function_record in
    select procedures.oid
    from pg_proc as procedures
    inner join pg_namespace as namespaces
      on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = 'send_channel_message'
  loop
    definition := pg_get_functiondef(function_record.oid);

    definition := replace(
      definition,
      'not between 1 and 5242880',
      'not between 1 and public.get_my_attachment_limit(channel_record.server_id)'
    );

    definition := replace(
      definition,
      'not between 1 and public.get_my_attachment_limit()',
      'not between 1 and public.get_my_attachment_limit(channel_record.server_id)'
    );

    execute definition;
  end loop;
end;
$$;

alter table public.servers
drop constraint if exists servers_icon_path,
drop constraint if exists servers_banner_path;

alter table public.servers
add constraint servers_icon_path
check (
  icon_path is null
  or (
    split_part(icon_path, '/', 1) = id::text
    and icon_path ~
      '^[0-9a-f-]{36}/icon-[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$'
  )
),
add constraint servers_banner_path
check (
  banner_path is null
  or (
    split_part(banner_path, '/', 1) = id::text
    and banner_path ~
      '^[0-9a-f-]{36}/banner-[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$'
  )
);

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
  normalized_name text :=
    public.normalize_server_name(server_name);
  normalized_description text :=
    nullif(btrim(coalesce(server_description, '')), '');
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

  if server_name ~ '[[:cntrl:]]'
    or char_length(normalized_name) not between 2 and 80
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_server_name';
  end if;

  if normalized_description is not null
    and (
      server_description ~ '[[:cntrl:]]'
      or char_length(normalized_description) > 500
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_server_description';
  end if;

  if server_icon_path is not null
    and server_icon_path !~
      (
        '^' || target_server_id::text ||
        '/icon-[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$'
      )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_server_icon_path';
  end if;

  if server_banner_path is not null
    and server_banner_path !~
      (
        '^' || target_server_id::text ||
        '/banner-[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$'
      )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_server_banner_path';
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

create or replace function public.enforce_server_arcana_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_level integer;
begin
  if (
    new.icon_path is distinct from old.icon_path
    and new.icon_path ~ '\.gif$'
  )
  or (
    new.banner_path is distinct from old.banner_path
    and new.banner_path ~ '\.gif$'
  )
  then
    select metrics.circle_level
    into current_level
    from public.calculate_server_arcana_status(new.id) as metrics;

    if coalesce(current_level, 0) < 1 then
      raise exception using
        errcode = '42501',
        message = 'server_arcana_level_required';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists servers_enforce_arcana_media
on public.servers;

create trigger servers_enforce_arcana_media
before update of icon_path, banner_path
on public.servers
for each row
execute function public.enforce_server_arcana_media();

create or replace function public.can_manage_server_media(
  object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_server_id uuid;
  object_extension text;
  current_level integer;
begin
  if auth.uid() is null
    or object_name is null
    or object_name !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(icon|banner)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif)$'
  then
    return false;
  end if;

  target_server_id :=
    split_part(object_name, '/', 1)::uuid;
  object_extension :=
    lower(substring(object_name from '\.([a-z0-9]+)$'));

  if not exists (
    select 1
    from public.servers
    where servers.id = target_server_id
      and servers.owner_id = auth.uid()
  ) then
    return false;
  end if;

  if object_extension = 'gif' then
    select metrics.circle_level
    into current_level
    from public.calculate_server_arcana_status(target_server_id) as metrics;

    if coalesce(current_level, 0) < 1 then
      return false;
    end if;
  end if;

  return true;
exception
  when invalid_text_representation then
    return false;
end;
$$;

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]
where id = 'server-media';

drop policy if exists crypt_server_media_insert_owner
on storage.objects;

create policy crypt_server_media_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'server-media'
  and public.can_manage_server_media(name)
  and lower(storage.extension(name)) = any (
    array['jpg', 'jpeg', 'png', 'webp', 'gif']
  )
);

revoke all on function public.get_server_arcana_status(uuid)
from public, anon;

revoke all on function public.get_my_server_arcana_statuses()
from public, anon;

revoke all on function public.set_server_arcana_gradient(
  uuid,
  text,
  text,
  smallint
)
from public, anon;

revoke all on function public.clear_server_arcana_gradient(uuid)
from public, anon;

revoke all on function public.get_my_attachment_limit(uuid)
from public, anon;

revoke all on function public.get_my_attachment_limit()
from public, anon;

revoke all on function public.enforce_server_arcana_media()
from public, anon, authenticated;

revoke all on function public.can_manage_server_media(text)
from public, anon;

grant execute on function public.get_server_arcana_status(uuid)
to authenticated;

grant execute on function public.get_my_server_arcana_statuses()
to authenticated;

grant execute on function public.set_server_arcana_gradient(
  uuid,
  text,
  text,
  smallint
)
to authenticated;

grant execute on function public.clear_server_arcana_gradient(uuid)
to authenticated;

grant execute on function public.get_my_attachment_limit(uuid)
to authenticated;

grant execute on function public.get_my_attachment_limit()
to authenticated;

grant execute on function public.can_manage_server_media(text)
to authenticated;

do $$
begin
  alter publication supabase_realtime
  add table public.server_arcana_runes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

comment on function public.get_server_arcana_status(uuid) is
  'Retorna nível, progresso, benefícios e identidade do Círculo Arcano de um servidor acessível.';

comment on function public.get_my_server_arcana_statuses() is
  'Lista em uma única consulta os Círculos Arcanos dos servidores da pessoa autenticada.';

comment on function public.get_my_attachment_limit(uuid) is
  'Combina o limite pessoal da Arcana com o benefício coletivo do servidor informado.';

comment on column public.servers.arcana_gradient_start is
  'Primeira cor da identidade coletiva desbloqueada pelo Círculo Elevado.';
