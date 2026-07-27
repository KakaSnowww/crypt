create table public.server_moderation_settings (
  server_id uuid primary key references public.servers (id) on delete cascade,
  allow_member_reports boolean not null default true,
  require_ban_reason boolean not null default true,
  notify_moderators_on_report boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.server_audit_logs (
  id bigint generated always as identity primary key,
  server_id uuid not null references public.servers (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  target_profile_id uuid references public.profiles (id) on delete set null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  constraint server_audit_action check (
    action in (
      'member_kicked',
      'member_banned',
      'member_unbanned',
      'report_resolved',
      'moderation_settings_updated'
    )
  ),
  constraint server_audit_reason_length
    check (reason is null or char_length(reason) <= 300),
  constraint server_audit_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index server_audit_logs_server_idx
on public.server_audit_logs (server_id, created_at desc, id desc);

create table public.server_reports (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_profile_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default clock_timestamp(),
  resolved_at timestamptz,
  constraint server_reports_profiles_different
    check (reporter_id <> reported_profile_id),
  constraint server_reports_reason check (
    reason in ('spam', 'harassment', 'inappropriate_content', 'impersonation', 'other')
  ),
  constraint server_reports_details_length
    check (details is null or char_length(details) <= 1000),
  constraint server_reports_status check (status in ('open', 'resolved', 'dismissed')),
  constraint server_reports_resolution_length
    check (resolution_note is null or char_length(resolution_note) <= 500)
);

create index server_reports_moderation_idx
on public.server_reports (server_id, status, created_at desc);

create unique index server_reports_daily_duplicate_idx
on public.server_reports (server_id, reporter_id, reported_profile_id, reason, ((created_at at time zone 'UTC')::date));

insert into public.server_moderation_settings (server_id)
select servers.id
from public.servers
on conflict (server_id) do nothing;

create or replace function public.create_server_moderation_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.server_moderation_settings (server_id)
  values (new.id)
  on conflict (server_id) do nothing;
  return new;
end;
$$;

create trigger servers_create_moderation_settings
after insert on public.servers
for each row execute function public.create_server_moderation_settings();

create or replace function public.can_moderate_server_member(
  target_server_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and target_profile_id is not null
    and target_profile_id <> auth.uid()
    and exists (
      select 1
      from public.server_members
      where server_members.server_id = target_server_id
        and server_members.profile_id = target_profile_id
    )
    and not exists (
      select 1
      from public.servers
      where servers.id = target_server_id
        and servers.owner_id = target_profile_id
    )
    and (
      public.is_server_owner(target_server_id)
      or (
        public.has_server_permission(target_server_id, 64)
        and public.get_highest_server_role_position(target_server_id, auth.uid())
          > public.get_highest_server_role_position(target_server_id, target_profile_id)
      )
    );
$$;

create or replace function public.get_server_moderation_settings(target_server_id uuid)
returns table (
  allow_member_reports boolean,
  require_ban_reason boolean,
  notify_moderators_on_report boolean,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 64)
  ) then
    raise exception using errcode = '42501', message = 'server_moderation_required';
  end if;

  return query
  select
    settings.allow_member_reports,
    settings.require_ban_reason,
    settings.notify_moderators_on_report,
    settings.updated_at
  from public.server_moderation_settings as settings
  where settings.server_id = target_server_id;
end;
$$;

create or replace function public.update_server_moderation_settings(
  target_server_id uuid,
  reports_enabled boolean,
  ban_reason_required boolean,
  report_notifications_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_server_owner(target_server_id) then
    raise exception using errcode = '42501', message = 'server_owner_required';
  end if;

  insert into public.server_moderation_settings (
    server_id,
    allow_member_reports,
    require_ban_reason,
    notify_moderators_on_report,
    updated_by,
    updated_at
  )
  values (
    target_server_id,
    reports_enabled,
    ban_reason_required,
    report_notifications_enabled,
    auth.uid(),
    clock_timestamp()
  )
  on conflict (server_id) do update
  set
    allow_member_reports = excluded.allow_member_reports,
    require_ban_reason = excluded.require_ban_reason,
    notify_moderators_on_report = excluded.notify_moderators_on_report,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into public.server_audit_logs (server_id, actor_id, action)
  values (target_server_id, auth.uid(), 'moderation_settings_updated');
end;
$$;

create or replace function public.kick_server_member(
  target_server_id uuid,
  target_profile_id uuid,
  moderation_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_reason text := nullif(btrim(coalesce(moderation_reason, '')), '');
begin
  if normalized_reason is not null and char_length(normalized_reason) > 300 then
    raise exception using errcode = '22023', message = 'moderation_reason_too_long';
  end if;

  if not public.can_moderate_server_member(target_server_id, target_profile_id) then
    raise exception using errcode = '42501', message = 'cannot_moderate_member';
  end if;

  delete from public.server_members
  where server_id = target_server_id and profile_id = target_profile_id;

  insert into public.server_audit_logs (
    server_id, actor_id, target_profile_id, action, reason
  )
  values (
    target_server_id, auth.uid(), target_profile_id, 'member_kicked', normalized_reason
  );
end;
$$;

create or replace function public.ban_server_member(
  target_server_id uuid,
  target_profile_id uuid,
  moderation_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_reason text := nullif(btrim(coalesce(moderation_reason, '')), '');
  reason_required boolean;
begin
  select settings.require_ban_reason
  into reason_required
  from public.server_moderation_settings as settings
  where settings.server_id = target_server_id;

  if coalesce(reason_required, true) and normalized_reason is null then
    raise exception using errcode = '22023', message = 'ban_reason_required';
  end if;

  if normalized_reason is not null and char_length(normalized_reason) > 300 then
    raise exception using errcode = '22023', message = 'moderation_reason_too_long';
  end if;

  if not public.can_moderate_server_member(target_server_id, target_profile_id) then
    raise exception using errcode = '42501', message = 'cannot_moderate_member';
  end if;

  insert into public.server_bans (server_id, profile_id, banned_by, reason, created_at)
  values (target_server_id, target_profile_id, auth.uid(), normalized_reason, clock_timestamp())
  on conflict (server_id, profile_id) do update
  set banned_by = excluded.banned_by, reason = excluded.reason, created_at = excluded.created_at;

  delete from public.server_members
  where server_id = target_server_id and profile_id = target_profile_id;

  insert into public.server_audit_logs (
    server_id, actor_id, target_profile_id, action, reason
  )
  values (
    target_server_id, auth.uid(), target_profile_id, 'member_banned', normalized_reason
  );
end;
$$;

create or replace function public.unban_server_member(
  target_server_id uuid,
  target_profile_id uuid,
  moderation_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_reason text := nullif(btrim(coalesce(moderation_reason, '')), '');
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 64)
  ) then
    raise exception using errcode = '42501', message = 'server_moderation_required';
  end if;

  delete from public.server_bans
  where server_id = target_server_id and profile_id = target_profile_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'server_ban_not_found';
  end if;

  insert into public.server_audit_logs (
    server_id, actor_id, target_profile_id, action, reason
  )
  values (
    target_server_id, auth.uid(), target_profile_id, 'member_unbanned', normalized_reason
  );
end;
$$;

create or replace function public.report_server_member(
  target_server_id uuid,
  target_profile_id uuid,
  report_reason text,
  report_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_details text := nullif(btrim(coalesce(report_details, '')), '');
  report_id uuid;
  reports_enabled boolean;
begin
  if not public.is_server_member(target_server_id) then
    raise exception using errcode = '42501', message = 'server_membership_required';
  end if;

  if target_profile_id = auth.uid()
    or not exists (
      select 1
      from public.server_members
      where server_members.server_id = target_server_id
        and server_members.profile_id = target_profile_id
    )
  then
    raise exception using errcode = '22023', message = 'invalid_report_target';
  end if;

  select settings.allow_member_reports
  into reports_enabled
  from public.server_moderation_settings as settings
  where settings.server_id = target_server_id;

  if not coalesce(reports_enabled, true) then
    raise exception using errcode = '42501', message = 'server_reports_disabled';
  end if;

  if report_reason not in ('spam', 'harassment', 'inappropriate_content', 'impersonation', 'other') then
    raise exception using errcode = '22023', message = 'invalid_report_reason';
  end if;

  if normalized_details is not null and char_length(normalized_details) > 1000 then
    raise exception using errcode = '22023', message = 'report_details_too_long';
  end if;

  insert into public.server_reports (
    server_id, reporter_id, reported_profile_id, reason, details
  )
  values (
    target_server_id, auth.uid(), target_profile_id, report_reason, normalized_details
  )
  returning id into report_id;

  return report_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'report_already_sent';
end;
$$;

create or replace function public.resolve_server_report(
  target_report_id uuid,
  resolution_status text,
  resolution_details text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_record public.server_reports%rowtype;
  normalized_details text := nullif(btrim(coalesce(resolution_details, '')), '');
begin
  select * into report_record
  from public.server_reports
  where id = target_report_id
  for update;

  if report_record.id is null then
    raise exception using errcode = 'P0002', message = 'server_report_not_found';
  end if;

  if not (
    public.is_server_owner(report_record.server_id)
    or public.has_server_permission(report_record.server_id, 64)
  ) then
    raise exception using errcode = '42501', message = 'server_moderation_required';
  end if;

  if resolution_status not in ('resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'invalid_report_status';
  end if;

  update public.server_reports
  set
    status = resolution_status,
    resolved_by = auth.uid(),
    resolution_note = normalized_details,
    resolved_at = clock_timestamp()
  where id = target_report_id;

  insert into public.server_audit_logs (
    server_id, actor_id, target_profile_id, action, reason,
    metadata
  )
  values (
    report_record.server_id,
    auth.uid(),
    report_record.reported_profile_id,
    'report_resolved',
    normalized_details,
    jsonb_build_object('report_id', target_report_id, 'status', resolution_status)
  );
end;
$$;

create or replace function public.get_server_bans(target_server_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  banned_by_display_name text,
  reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 64)
  ) then
    raise exception using errcode = '42501', message = 'server_moderation_required';
  end if;

  return query
  select
    bans.profile_id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    moderators.display_name,
    bans.reason,
    bans.created_at
  from public.server_bans as bans
  join public.profiles on profiles.id = bans.profile_id
  left join public.profiles as moderators on moderators.id = bans.banned_by
  where bans.server_id = target_server_id
  order by bans.created_at desc;
end;
$$;

create or replace function public.get_server_reports(
  target_server_id uuid,
  report_status text default 'open'
)
returns table (
  report_id uuid,
  reporter_display_name text,
  reporter_handle text,
  reported_profile_id uuid,
  reported_display_name text,
  reported_handle text,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  resolution_note text,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 64)
  ) then
    raise exception using errcode = '42501', message = 'server_moderation_required';
  end if;

  return query
  select
    reports.id,
    reporters.display_name,
    reporters.handle,
    reports.reported_profile_id,
    reported.display_name,
    reported.handle,
    reports.reason,
    reports.details,
    reports.status,
    reports.created_at,
    reports.resolution_note,
    reports.resolved_at
  from public.server_reports as reports
  join public.profiles as reporters on reporters.id = reports.reporter_id
  join public.profiles as reported on reported.id = reports.reported_profile_id
  where reports.server_id = target_server_id
    and (report_status = 'all' or reports.status = report_status)
  order by reports.created_at desc;
end;
$$;

create or replace function public.get_server_audit_logs(
  target_server_id uuid,
  result_limit integer default 100
)
returns table (
  audit_id bigint,
  actor_display_name text,
  actor_handle text,
  target_display_name text,
  target_handle text,
  action text,
  reason text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.is_server_owner(target_server_id)
    or public.has_server_permission(target_server_id, 64)
  ) then
    raise exception using errcode = '42501', message = 'server_moderation_required';
  end if;

  return query
  select
    logs.id,
    actors.display_name,
    actors.handle,
    targets.display_name,
    targets.handle,
    logs.action,
    logs.reason,
    logs.metadata,
    logs.created_at
  from public.server_audit_logs as logs
  left join public.profiles as actors on actors.id = logs.actor_id
  left join public.profiles as targets on targets.id = logs.target_profile_id
  where logs.server_id = target_server_id
  order by logs.created_at desc, logs.id desc
  limit greatest(1, least(coalesce(result_limit, 100), 200));
end;
$$;

alter table public.server_moderation_settings enable row level security;
alter table public.server_moderation_settings force row level security;
alter table public.server_audit_logs enable row level security;
alter table public.server_audit_logs force row level security;
alter table public.server_reports enable row level security;
alter table public.server_reports force row level security;

revoke all on table public.server_moderation_settings from anon, authenticated;
revoke all on table public.server_audit_logs from anon, authenticated;
revoke all on table public.server_reports from anon, authenticated;

revoke all on function public.can_moderate_server_member(uuid, uuid) from public;
revoke all on function public.create_server_moderation_settings() from public;
revoke all on function public.get_server_moderation_settings(uuid) from public;
revoke all on function public.update_server_moderation_settings(uuid, boolean, boolean, boolean) from public;
revoke all on function public.kick_server_member(uuid, uuid, text) from public;
revoke all on function public.ban_server_member(uuid, uuid, text) from public;
revoke all on function public.unban_server_member(uuid, uuid, text) from public;
revoke all on function public.report_server_member(uuid, uuid, text, text) from public;
revoke all on function public.resolve_server_report(uuid, text, text) from public;
revoke all on function public.get_server_bans(uuid) from public;
revoke all on function public.get_server_reports(uuid, text) from public;
revoke all on function public.get_server_audit_logs(uuid, integer) from public;

grant execute on function public.can_moderate_server_member(uuid, uuid) to authenticated;
grant execute on function public.get_server_moderation_settings(uuid) to authenticated;
grant execute on function public.update_server_moderation_settings(uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.kick_server_member(uuid, uuid, text) to authenticated;
grant execute on function public.ban_server_member(uuid, uuid, text) to authenticated;
grant execute on function public.unban_server_member(uuid, uuid, text) to authenticated;
grant execute on function public.report_server_member(uuid, uuid, text, text) to authenticated;
grant execute on function public.resolve_server_report(uuid, text, text) to authenticated;
grant execute on function public.get_server_bans(uuid) to authenticated;
grant execute on function public.get_server_reports(uuid, text) to authenticated;
grant execute on function public.get_server_audit_logs(uuid, integer) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.server_reports;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.server_audit_logs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
