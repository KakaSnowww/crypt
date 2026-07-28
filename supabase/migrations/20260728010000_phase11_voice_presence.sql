create table public.voice_channel_presence (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  channel_id uuid not null references public.server_channels(id) on delete cascade,
  microphone_muted boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index voice_channel_presence_channel_idx
on public.voice_channel_presence (channel_id, last_seen_at desc);

alter table public.voice_channel_presence enable row level security;
alter table public.voice_channel_presence force row level security;

create policy voice_channel_presence_read_visible_channels
on public.voice_channel_presence
for select
to authenticated
using (public.can_view_channel(channel_id, auth.uid()));

create or replace function public.set_my_voice_channel_presence(
  target_channel_id uuid,
  microphone_is_muted boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.voice_channel_presence
  where profile_id = auth.uid();

  if target_channel_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.server_channels
    where server_channels.id = target_channel_id
      and server_channels.channel_type in ('voice', 'video')
      and public.can_view_channel(target_channel_id, auth.uid())
  ) then
    raise exception using errcode = '42501', message = 'voice_channel_access_denied';
  end if;

  insert into public.voice_channel_presence (
    profile_id,
    channel_id,
    microphone_muted,
    joined_at,
    last_seen_at
  )
  values (
    auth.uid(),
    target_channel_id,
    microphone_is_muted,
    now(),
    now()
  );
end;
$$;

create or replace function public.get_server_voice_channel_presence(target_server_id uuid)
returns table (
  profile_id uuid,
  channel_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  microphone_muted boolean,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    presence.profile_id,
    presence.channel_id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    presence.microphone_muted,
    presence.joined_at
  from public.voice_channel_presence as presence
  join public.server_channels as channels
    on channels.id = presence.channel_id
  join public.profiles
    on profiles.id = presence.profile_id
  where channels.server_id = target_server_id
    and presence.last_seen_at > now() - interval '45 seconds'
    and public.is_server_member(target_server_id)
    and public.can_view_channel(presence.channel_id, auth.uid())
  order by presence.joined_at;
$$;

revoke all on table public.voice_channel_presence from anon, authenticated;
revoke all on function public.set_my_voice_channel_presence(uuid, boolean) from public;
revoke all on function public.get_server_voice_channel_presence(uuid) from public;

grant select on table public.voice_channel_presence to authenticated;
grant execute on function public.set_my_voice_channel_presence(uuid, boolean) to authenticated;
grant execute on function public.get_server_voice_channel_presence(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'voice_channel_presence'
  ) then
    alter publication supabase_realtime add table public.voice_channel_presence;
  end if;
end;
$$;
