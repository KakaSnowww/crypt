set lock_timeout = '5s';
set statement_timeout = '90s';

alter table public.user_presence
add column if not exists presence_mode text not null default 'automatic',
add column if not exists custom_status text,
add column if not exists custom_status_expires_at timestamptz;

alter table public.user_presence
drop constraint if exists user_presence_mode_check,
drop constraint if exists user_presence_custom_status_check,
drop constraint if exists user_presence_custom_status_expiration_check;

alter table public.user_presence
add constraint user_presence_mode_check
  check (presence_mode in ('automatic', 'online', 'away', 'busy', 'invisible')),
add constraint user_presence_custom_status_check
  check (
    custom_status is null
    or (
      char_length(custom_status) between 1 and 128
      and custom_status !~ '[[:cntrl:]]'
    )
  ),
add constraint user_presence_custom_status_expiration_check
  check (
    custom_status is not null
    or custom_status_expires_at is null
  );

update public.user_presence
set presence_mode = case
  when status = 'busy' then 'busy'
  when status = 'away' then 'automatic'
  when status = 'online' then 'automatic'
  else 'automatic'
end
where presence_mode = 'automatic';

create or replace function public.set_my_presence(next_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if next_status not in ('online', 'away', 'busy', 'offline') then
    raise exception using errcode = '22023', message = 'invalid_presence_status';
  end if;

  insert into public.user_presence (
    profile_id,
    status,
    presence_mode,
    last_seen_at
  )
  values (
    auth.uid(),
    next_status,
    'automatic',
    now()
  )
  on conflict (profile_id)
  do update set
    status = case public.user_presence.presence_mode
      when 'online' then 'online'
      when 'away' then 'away'
      when 'busy' then 'busy'
      when 'invisible' then 'offline'
      else excluded.status
    end,
    last_seen_at = excluded.last_seen_at,
    custom_status = case
      when public.user_presence.custom_status_expires_at is not null
        and public.user_presence.custom_status_expires_at <= now()
      then null
      else public.user_presence.custom_status
    end,
    custom_status_expires_at = case
      when public.user_presence.custom_status_expires_at is not null
        and public.user_presence.custom_status_expires_at <= now()
      then null
      else public.user_presence.custom_status_expires_at
    end,
    updated_at = now();
end;
$$;

create or replace function public.heartbeat_my_presence(app_is_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  insert into public.user_presence (
    profile_id,
    status,
    presence_mode,
    last_seen_at
  )
  values (
    auth.uid(),
    case when coalesce(app_is_active, false) then 'online' else 'away' end,
    'automatic',
    now()
  )
  on conflict (profile_id)
  do update set
    status = case public.user_presence.presence_mode
      when 'online' then 'online'
      when 'away' then 'away'
      when 'busy' then 'busy'
      when 'invisible' then 'offline'
      else case
        when coalesce(app_is_active, false) then 'online'
        else 'away'
      end
    end,
    last_seen_at = now(),
    custom_status = case
      when public.user_presence.custom_status_expires_at is not null
        and public.user_presence.custom_status_expires_at <= now()
      then null
      else public.user_presence.custom_status
    end,
    custom_status_expires_at = case
      when public.user_presence.custom_status_expires_at is not null
        and public.user_presence.custom_status_expires_at <= now()
      then null
      else public.user_presence.custom_status_expires_at
    end,
    updated_at = now();
end;
$$;

create or replace function public.set_my_presence_preference(
  next_mode text,
  next_custom_status text default null,
  custom_status_duration_minutes integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_mode text := lower(btrim(coalesce(next_mode, '')));
  normalized_custom_status text :=
    nullif(btrim(coalesce(next_custom_status, '')), '');
  resolved_status text;
  resolved_expiration timestamptz;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if normalized_mode not in ('automatic', 'online', 'away', 'busy', 'invisible') then
    raise exception using errcode = '22023', message = 'invalid_presence_mode';
  end if;

  if normalized_custom_status is not null and (
    char_length(normalized_custom_status) > 128
    or normalized_custom_status ~ '[[:cntrl:]]'
  ) then
    raise exception using errcode = '22023', message = 'invalid_custom_status';
  end if;

  if custom_status_duration_minutes is not null
    and custom_status_duration_minutes not between 15 and 10080
  then
    raise exception using errcode = '22023', message = 'invalid_custom_status_duration';
  end if;

  resolved_status := case normalized_mode
    when 'online' then 'online'
    when 'away' then 'away'
    when 'busy' then 'busy'
    when 'invisible' then 'offline'
    else 'online'
  end;

  resolved_expiration := case
    when normalized_custom_status is null then null
    when custom_status_duration_minutes is null then null
    else now() + make_interval(mins => custom_status_duration_minutes)
  end;

  insert into public.user_presence (
    profile_id,
    status,
    presence_mode,
    custom_status,
    custom_status_expires_at,
    last_seen_at
  )
  values (
    auth.uid(),
    resolved_status,
    normalized_mode,
    normalized_custom_status,
    resolved_expiration,
    now()
  )
  on conflict (profile_id)
  do update set
    status = excluded.status,
    presence_mode = excluded.presence_mode,
    custom_status = excluded.custom_status,
    custom_status_expires_at = excluded.custom_status_expires_at,
    last_seen_at = excluded.last_seen_at,
    updated_at = now();
end;
$$;

create or replace function public.get_my_presence_preferences()
returns table (
  presence_mode text,
  status text,
  custom_status text,
  custom_status_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(presence.presence_mode, 'automatic'),
    coalesce(presence.status, 'offline'),
    case
      when presence.custom_status_expires_at is null
        or presence.custom_status_expires_at > now()
      then presence.custom_status
      else null
    end,
    case
      when presence.custom_status_expires_at is null
        or presence.custom_status_expires_at > now()
      then presence.custom_status_expires_at
      else null
    end
  from (select auth.uid() as profile_id) caller
  left join public.user_presence presence
    on presence.profile_id = caller.profile_id
  where caller.profile_id is not null;
$$;

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
  current_activity jsonb,
  presence_status text,
  custom_status text
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
    coalesce(subscription.consecutive_months, 0),
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
    activity_data.item,
    case
      when public.can_view_presence(p.id)
        and presence.last_seen_at > now() - interval '2 minutes'
        and presence.status <> 'offline'
      then presence.status
      else 'offline'
    end,
    case
      when public.can_view_presence(p.id)
        and (
          presence.custom_status_expires_at is null
          or presence.custom_status_expires_at > now()
        )
      then presence.custom_status
      else null
    end
  from public.profiles p
  join public.profile_settings settings
    on settings.profile_id = p.id
  left join public.arcana_subscriptions subscription
    on subscription.profile_id = p.id
  left join public.user_presence presence
    on presence.profile_id = p.id
  left join lateral public.get_arcana_tier(
    greatest(1, coalesce(subscription.consecutive_months, 1))
  ) tier on true
  left join lateral (
    select
      array_agg(interest.label order by category.sort_order, interest.sort_order) as labels,
      array_agg(distinct category.label order by category.label) as category_labels
    from public.profile_interests selection
    join public.interests interest
      on interest.id = selection.interest_id
    join public.interest_categories category
      on category.id = interest.category_id
    where selection.profile_id = p.id
  ) interests_data on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'provider', connection.provider,
        'display_name', connection.display_name,
        'profile_url', connection.profile_url,
        'avatar_url', connection.avatar_url,
        'details', connection.details,
        'last_synced_at', connection.last_synced_at
      )
      order by connection.provider
    ) as items
    from public.external_connections connection
    where connection.profile_id = p.id
      and connection.show_on_profile
  ) connections_data on true
  left join lateral (
    select jsonb_build_object(
      'provider', activity.provider,
      'type', activity.activity_type,
      'title', activity.title,
      'subtitle', activity.subtitle,
      'image_url', activity.image_url,
      'external_url', activity.external_url,
      'started_at', activity.started_at,
      'ends_at', activity.ends_at
    ) as item
    from public.profile_activities activity
    join public.external_connections connection
      on connection.profile_id = activity.profile_id
      and connection.provider = activity.provider
      and connection.show_activity
    where activity.profile_id = p.id
      and activity.expires_at > now()
  ) activity_data on true
  where p.handle = normalized_target
    and not public.has_block_between(p.id)
    and (
      p.id = auth.uid()
      or settings.discoverable_by_search
      or public.are_friends(p.id)
      or exists (
        select 1
        from public.friend_requests request
        where
          (
            request.sender_id = auth.uid()
            and request.receiver_id = p.id
          )
          or
          (
            request.sender_id = p.id
            and request.receiver_id = auth.uid()
          )
      )
    )
  limit 1;
end;
$$;

revoke select on table public.user_presence from authenticated;
grant select (
  profile_id,
  status,
  last_seen_at,
  updated_at,
  custom_status,
  custom_status_expires_at
) on table public.user_presence to authenticated;

revoke all on function public.heartbeat_my_presence(boolean) from public, anon;
revoke all on function public.set_my_presence_preference(text, text, integer) from public, anon;
revoke all on function public.get_my_presence_preferences() from public, anon;
revoke all on function public.get_public_profile_by_handle(text) from public, anon;

grant execute on function public.heartbeat_my_presence(boolean) to authenticated;
grant execute on function public.set_my_presence_preference(text, text, integer) to authenticated;
grant execute on function public.get_my_presence_preferences() to authenticated;
grant execute on function public.get_public_profile_by_handle(text) to authenticated;

comment on column public.user_presence.presence_mode is
  'Preferência privada. Invisível é armazenado publicamente apenas como offline.';
comment on column public.user_presence.custom_status is
  'Mensagem curta exibida somente quando a presença pode ser visualizada.';
