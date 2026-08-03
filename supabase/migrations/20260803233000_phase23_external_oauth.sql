set lock_timeout = '5s';
set statement_timeout = '90s';

alter table public.external_connections
add column if not exists details jsonb not null default '{}'::jsonb,
add column if not exists last_synced_at timestamptz;

alter table public.external_connections
drop constraint if exists external_connections_details_object_check;

alter table public.external_connections
add constraint external_connections_details_object_check
check (jsonb_typeof(details) = 'object');

create unique index if not exists external_connections_provider_user_unique
on public.external_connections(provider, external_user_id);

create table if not exists public.external_connection_credentials (
  profile_id uuid not null,
  provider text not null check (provider in ('spotify', 'steam', 'youtube')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, provider),
  constraint external_connection_credentials_connection_fk
    foreign key (profile_id, provider)
    references public.external_connections(profile_id, provider)
    on delete cascade,
  constraint external_connection_credentials_oauth_tokens_check
    check (
      (provider = 'steam' and access_token_encrypted is null and refresh_token_encrypted is null)
      or
      (provider in ('spotify', 'youtube') and access_token_encrypted is not null)
    )
);

create table if not exists public.external_oauth_states (
  state_hash text primary key check (state_hash ~ '^[0-9a-f]{64}$'),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('spotify', 'steam', 'youtube')),
  code_verifier_encrypted text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint external_oauth_states_expiration_check check (expires_at > created_at),
  constraint external_oauth_states_verifier_check check (
    (provider = 'steam' and code_verifier_encrypted is null)
    or
    (provider in ('spotify', 'youtube') and code_verifier_encrypted is not null)
  )
);

create index if not exists external_oauth_states_profile_created_idx
on public.external_oauth_states(profile_id, created_at desc);

create index if not exists external_oauth_states_expires_idx
on public.external_oauth_states(expires_at);

alter table public.external_connection_credentials enable row level security;
alter table public.external_connection_credentials force row level security;
alter table public.external_oauth_states enable row level security;
alter table public.external_oauth_states force row level security;

revoke all on table public.external_connection_credentials from public, anon, authenticated;
revoke all on table public.external_oauth_states from public, anon, authenticated;

comment on table public.external_connection_credentials is
  'Tokens OAuth cifrados com AES-GCM. Acesso exclusivo da Edge Function external-oauth.';
comment on table public.external_oauth_states is
  'Estados OAuth de uso único, com validade curta e verificador PKCE cifrado.';
comment on column public.external_connections.details is
  'Somente metadados públicos e sanitizados do provedor, nunca tokens ou segredos.';

-- Recria a leitura pública para incluir os dados sanitizados de YouTube e Steam.
drop function if exists public.get_public_profile_by_handle(text);

create function public.get_public_profile_by_handle(target_handle text)
returns table(
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  avatar_position_x real,
  avatar_position_y real,
  avatar_zoom real,
  banner_path text,
  banner_position_x real,
  banner_position_y real,
  banner_zoom real,
  profile_effect text,
  profile_gradient_start text,
  profile_gradient_end text,
  profile_gradient_angle smallint,
  arcana_active boolean,
  arcana_months integer,
  arcana_tier_name text,
  arcana_tier_color text,
  bio text,
  created_at timestamptz,
  favorite_spotify_url text,
  favorite_spotify_title text,
  relationship_status text,
  mutual_friend_count bigint,
  allow_friend_requests boolean,
  interest_labels text[],
  interest_category_labels text[],
  connected_accounts jsonb,
  current_activity jsonb
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
    p.id,
    p.display_name,
    p.handle,
    p.avatar_path,
    p.avatar_position_x,
    p.avatar_position_y,
    p.avatar_zoom,
    p.banner_path,
    p.banner_position_x,
    p.banner_position_y,
    p.banner_zoom,
    p.profile_effect,
    p.profile_gradient_start,
    p.profile_gradient_end,
    p.profile_gradient_angle,
    public.has_active_arcana(p.id),
    coalesce(s.consecutive_months, 0),
    tier.tier_name,
    tier.tier_color,
    p.bio,
    p.created_at,
    p.favorite_spotify_url,
    p.favorite_spotify_title,
    public.get_connection_status(p.id),
    public.get_mutual_friend_count(p.id),
    settings.allow_friend_requests,
    case
      when settings.show_interests_on_profile and not settings.hide_all_interests
        then coalesce(interests_data.labels, '{}'::text[])
      else '{}'::text[]
    end,
    case
      when settings.show_interests_on_profile and not settings.hide_all_interests
        then coalesce(interests_data.category_labels, '{}'::text[])
      else '{}'::text[]
    end,
    coalesce(connections_data.items, '[]'::jsonb),
    activity_data.item
  from public.profiles p
  join public.profile_settings settings on settings.profile_id = p.id
  left join public.arcana_subscriptions s on s.profile_id = p.id
  left join lateral public.get_arcana_tier(
    greatest(1, coalesce(s.consecutive_months, 1))
  ) tier on true
  left join lateral (
    select
      array_agg(i.label order by c.sort_order, i.sort_order) as labels,
      array_agg(distinct c.label order by c.label) as category_labels
    from public.profile_interests pi
    join public.interests i on i.id = pi.interest_id
    join public.interest_categories c on c.id = i.category_id
    where pi.profile_id = p.id
  ) interests_data on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'provider', ec.provider,
        'display_name', ec.display_name,
        'profile_url', ec.profile_url,
        'avatar_url', ec.avatar_url,
        'details', ec.details,
        'last_synced_at', ec.last_synced_at
      )
      order by ec.provider
    ) as items
    from public.external_connections ec
    where ec.profile_id = p.id
      and ec.show_on_profile
  ) connections_data on true
  left join lateral (
    select jsonb_build_object(
      'provider', a.provider,
      'type', a.activity_type,
      'title', a.title,
      'subtitle', a.subtitle,
      'image_url', a.image_url,
      'external_url', a.external_url,
      'started_at', a.started_at,
      'ends_at', a.ends_at
    ) as item
    from public.profile_activities a
    join public.external_connections ec
      on ec.profile_id = a.profile_id
      and ec.provider = a.provider
      and ec.show_activity
    where a.profile_id = p.id
      and a.expires_at > now()
  ) activity_data on true
  where p.handle = normalized_target
    and not public.has_block_between(p.id)
    and (
      p.id = auth.uid()
      or settings.discoverable_by_search
      or public.are_friends(p.id)
      or exists (
        select 1
        from public.friend_requests fr
        where
          (fr.sender_id = auth.uid() and fr.receiver_id = p.id)
          or
          (fr.sender_id = p.id and fr.receiver_id = auth.uid())
      )
    )
  limit 1;
end;
$$;

revoke all on function public.get_public_profile_by_handle(text) from public, anon;
grant execute on function public.get_public_profile_by_handle(text) to authenticated;
