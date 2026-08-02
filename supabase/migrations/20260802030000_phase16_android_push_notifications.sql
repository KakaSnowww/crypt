create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null,
  platform text not null default 'android',
  push_token text not null,
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_devices_platform_check check (platform in ('android')),
  constraint push_devices_token_length check (char_length(push_token) between 20 and 4096),
  constraint push_devices_app_version_length check (
    app_version is null or char_length(app_version) between 1 and 32
  ),
  constraint push_devices_profile_device_unique unique (profile_id, device_id),
  constraint push_devices_token_unique unique (push_token)
);

create index push_devices_profile_enabled_idx
on public.push_devices (profile_id, enabled)
where enabled;

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.user_notifications(id) on delete cascade,
  push_device_id uuid not null references public.push_devices(id) on delete cascade,
  delivery_status text not null default 'processing',
  attempt_count integer not null default 1,
  provider_message_id text,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_deliveries_status_check check (
    delivery_status in ('processing', 'delivered', 'failed', 'invalid_token')
  ),
  constraint push_deliveries_attempt_count_check check (attempt_count between 1 and 10),
  constraint push_deliveries_notification_device_unique unique (notification_id, push_device_id)
);

create index push_deliveries_notification_idx
on public.push_deliveries (notification_id, created_at desc);

create trigger push_devices_set_updated_at
before update on public.push_devices
for each row execute function public.set_profile_updated_at();

create trigger push_deliveries_set_updated_at
before update on public.push_deliveries
for each row execute function public.set_profile_updated_at();

create or replace function public.register_my_push_device(
  device_identifier uuid,
  device_token text,
  client_app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  registered_device_id uuid;
  normalized_token text := btrim(device_token);
  normalized_version text := nullif(btrim(client_app_version), '');
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if device_identifier is null then
    raise exception using errcode = '22023', message = 'invalid_device_id';
  end if;

  if char_length(normalized_token) not between 20 and 4096 then
    raise exception using errcode = '22023', message = 'invalid_push_token';
  end if;

  if normalized_version is not null and char_length(normalized_version) > 32 then
    raise exception using errcode = '22023', message = 'invalid_app_version';
  end if;

  delete from public.push_devices
  where push_token = normalized_token
    and (profile_id <> current_profile_id or device_id <> device_identifier);

  insert into public.push_devices (
    profile_id,
    device_id,
    platform,
    push_token,
    app_version,
    enabled,
    last_seen_at
  )
  values (
    current_profile_id,
    device_identifier,
    'android',
    normalized_token,
    normalized_version,
    true,
    now()
  )
  on conflict (profile_id, device_id) do update
  set
    push_token = excluded.push_token,
    app_version = excluded.app_version,
    enabled = true,
    last_seen_at = now(),
    updated_at = now()
  returning id into registered_device_id;

  return registered_device_id;
end;
$$;

create or replace function public.unregister_my_push_device(device_identifier uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  delete from public.push_devices
  where profile_id = auth.uid()
    and device_id = device_identifier;
end;
$$;

alter table public.push_devices enable row level security;
alter table public.push_devices force row level security;
alter table public.push_deliveries enable row level security;
alter table public.push_deliveries force row level security;

revoke all on table public.push_devices from anon, authenticated;
revoke all on table public.push_deliveries from anon, authenticated;
revoke all on function public.register_my_push_device(uuid, text, text) from public;
revoke all on function public.unregister_my_push_device(uuid) from public;

grant execute on function public.register_my_push_device(uuid, text, text) to authenticated;
grant execute on function public.unregister_my_push_device(uuid) to authenticated;

comment on table public.push_devices is
  'Tokens FCM privados registrados por uma sessão Android autenticada.';
comment on table public.push_deliveries is
  'Controle administrativo e idempotente das tentativas de entrega por dispositivo.';
comment on function public.register_my_push_device(uuid, text, text) is
  'Registra ou atualiza exclusivamente o dispositivo Android da sessão atual.';
