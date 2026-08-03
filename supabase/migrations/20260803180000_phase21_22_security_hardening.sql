set lock_timeout = '5s';
set statement_timeout = '60s';

create table public.security_rate_limits (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (profile_id, action),
  constraint security_rate_limits_action_check check (action in ('livekit_token')),
  constraint security_rate_limits_count_check check (request_count > 0)
);

comment on table public.security_rate_limits is
  'Contadores internos para impedir emissão abusiva de credenciais temporárias.';

alter table public.security_rate_limits enable row level security;
alter table public.security_rate_limits force row level security;

revoke all on table public.security_rate_limits from anon, authenticated;

create or replace function public.consume_livekit_token_rate_limit()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  current_request_count integer;
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  insert into public.security_rate_limits (
    profile_id,
    action,
    window_started_at,
    request_count,
    updated_at
  )
  values (current_profile_id, 'livekit_token', now(), 1, now())
  on conflict (profile_id, action) do update
  set
    window_started_at = case
      when security_rate_limits.window_started_at <= now() - interval '1 minute' then now()
      else security_rate_limits.window_started_at
    end,
    request_count = case
      when security_rate_limits.window_started_at <= now() - interval '1 minute' then 1
      else security_rate_limits.request_count + 1
    end,
    updated_at = now()
  returning request_count into current_request_count;

  return current_request_count <= 12;
end;
$$;

comment on function public.consume_livekit_token_rate_limit() is
  'Permite no máximo doze emissões de token LiveKit por conta a cada minuto.';

revoke all on function public.consume_livekit_token_rate_limit() from public;
grant execute on function public.consume_livekit_token_rate_limit() to authenticated;

update storage.buckets
set
  public = case when id in ('profile-media', 'server-media') then true else false end,
  file_size_limit = 5242880,
  allowed_mime_types = case
    when id in ('profile-media', 'server-media', 'direct-group-media')
      then array['image/gif', 'image/jpeg', 'image/png', 'image/webp']
    else array[
      'application/pdf',
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain'
    ]
  end
where id in (
  'profile-media',
  'server-media',
  'message-attachments',
  'direct-message-attachments',
  'direct-group-media'
);

do $$
declare
  protected_table text;
begin
  foreach protected_table in array array[
    'channel_messages',
    'channel_read_states',
    'connection_notifications',
    'direct_conversation_participants',
    'direct_conversations',
    'direct_message_attachments',
    'direct_message_reactions',
    'direct_messages',
    'dismissed_friend_suggestions',
    'friend_requests',
    'friendships',
    'interest_categories',
    'interests',
    'message_attachments',
    'message_channel_mentions',
    'message_reactions',
    'message_user_mentions',
    'notification_preferences',
    'profile_interests',
    'profile_settings',
    'profiles',
    'push_deliveries',
    'push_devices',
    'security_rate_limits',
    'server_audit_logs',
    'server_bans',
    'server_categories',
    'server_channels',
    'server_invites',
    'server_member_roles',
    'server_members',
    'server_moderation_settings',
    'server_permission_overrides',
    'server_reports',
    'server_roles',
    'servers',
    'user_blocks',
    'user_notifications',
    'user_presence',
    'user_reports',
    'voice_channel_presence'
  ]
  loop
    execute format('alter table public.%I enable row level security', protected_table);
    execute format('alter table public.%I force row level security', protected_table);
  end loop;
end;
$$;

do $$
declare
  secured_function record;
begin
  for secured_function in
    select
      namespace.nspname as schema_name,
      procedure.proname as function_name,
      pg_get_function_identity_arguments(procedure.oid) as identity_arguments
    from pg_proc as procedure
    inner join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = ''''',
      secured_function.schema_name,
      secured_function.function_name,
      secured_function.identity_arguments
    );
    execute format(
      'revoke all on function %I.%I(%s) from public',
      secured_function.schema_name,
      secured_function.function_name,
      secured_function.identity_arguments
    );

    if secured_function.function_name <> 'is_handle_available' then
      execute format(
        'revoke all on function %I.%I(%s) from anon',
        secured_function.schema_name,
        secured_function.function_name,
        secured_function.identity_arguments
      );
    end if;
  end loop;
end;
$$;
