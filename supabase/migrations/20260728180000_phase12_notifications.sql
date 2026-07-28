set lock_timeout = '5s';
set statement_timeout = '60s';

create table public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  in_app_enabled boolean not null default true,
  system_enabled boolean not null default false,
  friend_activity_enabled boolean not null default true,
  direct_messages_enabled boolean not null default true,
  mentions_enabled boolean not null default true,
  moderation_enabled boolean not null default true,
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default clock_timestamp()
);

insert into public.notification_preferences (profile_id)
select profiles.id
from public.profiles
on conflict (profile_id) do nothing;

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  notification_type text not null,
  title text not null,
  body text not null,
  target_path text,
  resource_id uuid,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  constraint user_notifications_type check (
    notification_type in (
      'friend_request',
      'friend_accepted',
      'direct_message',
      'channel_mention',
      'moderation_report'
    )
  ),
  constraint user_notifications_title_length
    check (char_length(title) between 1 and 100),
  constraint user_notifications_body_length
    check (char_length(body) between 1 and 240),
  constraint user_notifications_target_path
    check (target_path is null or target_path ~ '^/app(?:/|$)'),
  constraint user_notifications_not_self
    check (actor_id is null or actor_id <> recipient_id)
);

create unique index user_notifications_dedupe_idx
on public.user_notifications (recipient_id, dedupe_key)
where dedupe_key is not null;

create index user_notifications_recipient_idx
on public.user_notifications (recipient_id, created_at desc, id desc);

create index user_notifications_unread_idx
on public.user_notifications (recipient_id, created_at desc)
where read_at is null;

alter table public.user_notifications replica identity full;

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_profile_updated_at();

create or replace function public.create_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_notification_preferences
after insert on public.profiles
for each row
execute function public.create_notification_preferences();

create or replace function public.notification_category_enabled(
  target_profile_id uuid,
  target_notification_type text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when target_notification_type in ('friend_request', 'friend_accepted')
        then preferences.friend_activity_enabled
      when target_notification_type = 'direct_message'
        then preferences.direct_messages_enabled
      when target_notification_type = 'channel_mention'
        then preferences.mentions_enabled
      when target_notification_type = 'moderation_report'
        then preferences.moderation_enabled
      else false
    end
  from public.notification_preferences as preferences
  where preferences.profile_id = target_profile_id;
$$;

create or replace function public.create_user_notification(
  target_recipient_id uuid,
  target_actor_id uuid,
  target_notification_type text,
  notification_title text,
  notification_body text,
  notification_target_path text,
  target_resource_id uuid,
  notification_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_recipient_id is null
    or target_recipient_id = target_actor_id
    or not coalesce(
      public.notification_category_enabled(
        target_recipient_id,
        target_notification_type
      ),
      true
    )
  then
    return;
  end if;

  insert into public.user_notifications (
    recipient_id,
    actor_id,
    notification_type,
    title,
    body,
    target_path,
    resource_id,
    dedupe_key
  )
  values (
    target_recipient_id,
    target_actor_id,
    target_notification_type,
    left(notification_title, 100),
    left(notification_body, 240),
    notification_target_path,
    target_resource_id,
    notification_dedupe_key
  )
  on conflict (recipient_id, dedupe_key)
    where dedupe_key is not null
  do nothing;
end;
$$;

create or replace function public.notify_connection_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
begin
  select profiles.display_name
  into actor_name
  from public.profiles
  where profiles.id = new.actor_id;

  perform public.create_user_notification(
    new.recipient_id,
    new.actor_id,
    new.notification_type,
    case
      when new.notification_type = 'friend_request' then 'Novo pedido de amizade'
      else 'Pedido de amizade aceito'
    end,
    case
      when new.notification_type = 'friend_request'
        then coalesce(actor_name, 'Uma pessoa') || ' quer se conectar com você.'
      else coalesce(actor_name, 'Uma pessoa') || ' aceitou seu pedido de amizade.'
    end,
    '/app/conexoes?aba=requests',
    new.friend_request_id,
    'connection:' || new.id::text
  );

  return new;
end;
$$;

create trigger connection_notifications_create_general_notification
after insert on public.connection_notifications
for each row
execute function public.notify_connection_activity();

create or replace function public.notify_channel_mention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_record record;
begin
  select
    messages.author_id,
    messages.channel_id,
    messages.server_id,
    messages.content,
    profiles.display_name as actor_name,
    channels.name as channel_name
  into message_record
  from public.channel_messages as messages
  left join public.profiles as profiles on profiles.id = messages.author_id
  join public.server_channels as channels on channels.id = messages.channel_id
  where messages.id = new.message_id;

  perform public.create_user_notification(
    new.profile_id,
    message_record.author_id,
    'channel_mention',
    'Você foi mencionado em #' || message_record.channel_name,
    coalesce(message_record.actor_name, 'Uma pessoa') || ': ' ||
      coalesce(nullif(left(message_record.content, 160), ''), 'Enviou um anexo'),
    '/app/servidores/' || message_record.server_id::text ||
      '/canais/' || message_record.channel_id::text,
    new.message_id,
    'mention:' || new.message_id::text || ':' || new.profile_id::text
  );

  return new;
end;
$$;

create trigger message_user_mentions_create_notification
after insert on public.message_user_mentions
for each row
execute function public.notify_channel_mention();

create or replace function public.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_record record;
  actor_name text;
begin
  if new.author_id is null then
    return new;
  end if;

  select profiles.display_name
  into actor_name
  from public.profiles
  where profiles.id = new.author_id;

  for recipient_record in
    select participants.profile_id
    from public.direct_conversation_participants as participants
    where participants.conversation_id = new.conversation_id
      and participants.profile_id <> new.author_id
  loop
    perform public.create_user_notification(
      recipient_record.profile_id,
      new.author_id,
      'direct_message',
      'Nova mensagem de ' || coalesce(actor_name, 'uma pessoa'),
      coalesce(nullif(left(new.content, 180), ''), 'Enviou um anexo'),
      '/app/mensagens/' || new.conversation_id::text,
      new.id,
      'direct-message:' || new.id::text || ':' || recipient_record.profile_id::text
    );
  end loop;

  return new;
end;
$$;

create trigger direct_messages_create_notification
after insert on public.direct_messages
for each row
execute function public.notify_direct_message();

create or replace function public.notify_moderators_about_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_record record;
  reporter_name text;
  server_name text;
begin
  if not coalesce(
    (
      select settings.notify_moderators_on_report
      from public.server_moderation_settings as settings
      where settings.server_id = new.server_id
    ),
    true
  ) then
    return new;
  end if;

  select profiles.display_name
  into reporter_name
  from public.profiles
  where profiles.id = new.reporter_id;

  select servers.name
  into server_name
  from public.servers
  where servers.id = new.server_id;

  for recipient_record in
    select distinct members.profile_id
    from public.server_members as members
    left join public.server_member_roles as assignments
      on assignments.server_id = members.server_id
      and assignments.profile_id = members.profile_id
    left join public.server_roles as roles
      on roles.id = assignments.role_id
    where members.server_id = new.server_id
      and members.profile_id <> new.reporter_id
      and (
        members.profile_id = (
          select servers.owner_id
          from public.servers
          where servers.id = new.server_id
        )
        or (coalesce(roles.permissions, 0) & 64) = 64
      )
  loop
    perform public.create_user_notification(
      recipient_record.profile_id,
      new.reporter_id,
      'moderation_report',
      'Nova denúncia em ' || coalesce(server_name, 'um servidor'),
      coalesce(reporter_name, 'Um membro') || ' enviou uma denúncia para análise.',
      '/app/servidores/' || new.server_id::text || '/moderacao',
      new.id,
      'moderation-report:' || new.id::text || ':' || recipient_record.profile_id::text
    );
  end loop;

  return new;
end;
$$;

create trigger server_reports_create_notification
after insert on public.server_reports
for each row
execute function public.notify_moderators_about_report();

create or replace function public.get_my_notifications(
  result_limit integer default 30,
  before_created_at timestamptz default null,
  unread_only boolean default false
)
returns table (
  notification_id uuid,
  notification_type text,
  title text,
  body text,
  target_path text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz,
  actor_id uuid,
  actor_display_name text,
  actor_handle text,
  actor_avatar_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    notifications.id,
    notifications.notification_type,
    notifications.title,
    notifications.body,
    notifications.target_path,
    notifications.resource_id,
    notifications.read_at,
    notifications.created_at,
    notifications.actor_id,
    actors.display_name,
    actors.handle,
    actors.avatar_path
  from public.user_notifications as notifications
  left join public.profiles as actors on actors.id = notifications.actor_id
  where notifications.recipient_id = auth.uid()
    and (
      before_created_at is null
      or notifications.created_at < before_created_at
    )
    and (not unread_only or notifications.read_at is null)
  order by notifications.created_at desc, notifications.id desc
  limit least(greatest(coalesce(result_limit, 30), 1), 50);
$$;

create or replace function public.get_my_notification_preferences()
returns table (
  in_app_enabled boolean,
  system_enabled boolean,
  friend_activity_enabled boolean,
  direct_messages_enabled boolean,
  mentions_enabled boolean,
  moderation_enabled boolean,
  sound_enabled boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    preferences.in_app_enabled,
    preferences.system_enabled,
    preferences.friend_activity_enabled,
    preferences.direct_messages_enabled,
    preferences.mentions_enabled,
    preferences.moderation_enabled,
    preferences.sound_enabled
  from public.notification_preferences as preferences
  where preferences.profile_id = auth.uid();
$$;

create or replace function public.save_my_notification_preferences(
  enable_in_app boolean,
  enable_system boolean,
  enable_friend_activity boolean,
  enable_direct_messages boolean,
  enable_mentions boolean,
  enable_moderation boolean,
  enable_sound boolean
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

  insert into public.notification_preferences (
    profile_id,
    in_app_enabled,
    system_enabled,
    friend_activity_enabled,
    direct_messages_enabled,
    mentions_enabled,
    moderation_enabled,
    sound_enabled
  )
  values (
    auth.uid(),
    enable_in_app,
    enable_system,
    enable_friend_activity,
    enable_direct_messages,
    enable_mentions,
    enable_moderation,
    enable_sound
  )
  on conflict (profile_id) do update
  set
    in_app_enabled = excluded.in_app_enabled,
    system_enabled = excluded.system_enabled,
    friend_activity_enabled = excluded.friend_activity_enabled,
    direct_messages_enabled = excluded.direct_messages_enabled,
    mentions_enabled = excluded.mentions_enabled,
    moderation_enabled = excluded.moderation_enabled,
    sound_enabled = excluded.sound_enabled;
end;
$$;

create or replace function public.mark_notification_read(target_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_notifications
  set read_at = coalesce(read_at, clock_timestamp())
  where id = target_notification_id
    and recipient_id = auth.uid();

  if not found then
    raise exception using errcode = 'P0002', message = 'notification_not_found';
  end if;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_notifications
  set read_at = clock_timestamp()
  where recipient_id = auth.uid()
    and read_at is null;
$$;

alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
alter table public.user_notifications enable row level security;
alter table public.user_notifications force row level security;

create policy notification_preferences_select_own
on public.notification_preferences
for select
to authenticated
using (profile_id = auth.uid());

create policy user_notifications_select_own
on public.user_notifications
for select
to authenticated
using (recipient_id = auth.uid());

revoke all on table public.notification_preferences from anon, authenticated;
revoke all on table public.user_notifications from anon, authenticated;
grant select on table public.notification_preferences to authenticated;
grant select on table public.user_notifications to authenticated;

revoke all on function public.notification_category_enabled(uuid, text) from public;
revoke all on function public.create_user_notification(
  uuid, uuid, text, text, text, text, uuid, text
) from public;
revoke all on function public.get_my_notifications(integer, timestamptz, boolean) from public;
revoke all on function public.get_my_notification_preferences() from public;
revoke all on function public.save_my_notification_preferences(
  boolean, boolean, boolean, boolean, boolean, boolean, boolean
) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;

grant execute on function public.get_my_notifications(integer, timestamptz, boolean)
to authenticated;
grant execute on function public.get_my_notification_preferences()
to authenticated;
grant execute on function public.save_my_notification_preferences(
  boolean, boolean, boolean, boolean, boolean, boolean, boolean
) to authenticated;
grant execute on function public.mark_notification_read(uuid)
to authenticated;
grant execute on function public.mark_all_notifications_read()
to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.user_notifications;
exception
  when duplicate_object then null;
end;
$$;

comment on table public.user_notifications is
  'Central privada de notificações internas da Fase 12.';
comment on table public.notification_preferences is
  'Preferências multiplataforma de notificações por pessoa.';
