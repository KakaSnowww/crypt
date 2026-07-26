set lock_timeout = '5s';
set statement_timeout = '60s';

alter table public.profile_settings
add column discoverable_by_search boolean not null default true;

drop policy if exists profiles_read_public_fields
on public.profiles;

create policy profiles_read_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

comment on policy profiles_read_own on public.profiles is
  'Impede enumeração direta. Busca e perfis de terceiros usam funções filtradas da Fase 5.';

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friend_requests_different_profiles
    check (sender_id <> receiver_id)
);

create unique index friend_requests_unique_pair_idx
on public.friend_requests (
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id)
);

create index friend_requests_sender_idx
on public.friend_requests (sender_id, created_at desc);

create index friend_requests_receiver_idx
on public.friend_requests (receiver_id, created_at desc);

create table public.friendships (
  user_low_id uuid not null references public.profiles (id) on delete cascade,
  user_high_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low_id, user_high_id),
  constraint friendships_canonical_pair
    check (user_low_id::text < user_high_id::text)
);

create index friendships_high_user_idx
on public.friendships (user_high_id, created_at desc);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_different_profiles
    check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_idx
on public.user_blocks (blocked_id, blocker_id);

create table public.dismissed_friend_suggestions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  suggested_profile_id uuid not null references public.profiles (id) on delete cascade,
  hidden_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, suggested_profile_id),
  constraint dismissed_suggestions_different_profiles
    check (profile_id <> suggested_profile_id)
);

create trigger dismissed_friend_suggestions_set_updated_at
before update on public.dismissed_friend_suggestions
for each row
execute function public.set_profile_updated_at();

create table public.connection_notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null,
  friend_request_id uuid references public.friend_requests (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint connection_notifications_type
    check (notification_type in ('friend_request', 'friend_accepted')),
  constraint connection_notifications_different_profiles
    check (recipient_id <> actor_id),
  constraint connection_notifications_request_consistency
    check (
      (notification_type = 'friend_request' and friend_request_id is not null)
      or (notification_type = 'friend_accepted' and friend_request_id is null)
    )
);

create index connection_notifications_recipient_idx
on public.connection_notifications (recipient_id, read_at, created_at desc);

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_profile_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint user_reports_different_profiles
    check (reporter_id <> reported_profile_id),
  constraint user_reports_reason
    check (
      reason in (
        'spam',
        'harassment',
        'fake_profile',
        'inappropriate_content',
        'other'
      )
    ),
  constraint user_reports_details_length
    check (details is null or char_length(details) between 1 and 500),
  constraint user_reports_status
    check (status in ('pending', 'reviewing', 'resolved', 'dismissed'))
);

create index user_reports_reporter_idx
on public.user_reports (reporter_id, created_at desc);

create index user_reports_moderation_idx
on public.user_reports (status, created_at);

create table public.user_presence (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'offline',
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_presence_status
    check (status in ('online', 'away', 'busy', 'offline'))
);

create trigger user_presence_set_updated_at
before update on public.user_presence
for each row
execute function public.set_profile_updated_at();

insert into public.user_presence (profile_id, status)
select profiles.id, 'offline'
from public.profiles
on conflict (profile_id) do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_handle text :=
    public.normalize_handle(coalesce(new.raw_user_meta_data ->> 'handle', ''));
  requested_display_name text :=
    btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if char_length(requested_display_name) not between 2 and 48
    or requested_display_name ~ '[[:cntrl:]]'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_display_name';
  end if;

  if not public.is_handle_available(normalized_handle) then
    raise exception using
      errcode = '23505',
      message = 'handle_unavailable';
  end if;

  insert into public.profiles (id, display_name, handle)
  values (new.id, requested_display_name, normalized_handle);

  insert into public.profile_settings (profile_id)
  values (new.id);

  insert into public.user_presence (profile_id, status)
  values (new.id, 'offline');

  return new;
exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'handle_unavailable';
end;
$$;

create or replace function public.has_block_between(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks
    where (
      user_blocks.blocker_id = auth.uid()
      and user_blocks.blocked_id = target_profile_id
    )
    or (
      user_blocks.blocker_id = target_profile_id
      and user_blocks.blocked_id = auth.uid()
    )
  );
$$;

create or replace function public.are_friends(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships
    where friendships.user_low_id =
      least(auth.uid()::text, target_profile_id::text)::uuid
      and friendships.user_high_id =
        greatest(auth.uid()::text, target_profile_id::text)::uuid
  );
$$;

create or replace function public.get_connection_status(target_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then 'none'
    when auth.uid() = target_profile_id then 'self'
    when public.has_block_between(target_profile_id) then 'blocked'
    when public.are_friends(target_profile_id) then 'friends'
    when exists (
      select 1
      from public.friend_requests
      where friend_requests.sender_id = auth.uid()
        and friend_requests.receiver_id = target_profile_id
    ) then 'outgoing_request'
    when exists (
      select 1
      from public.friend_requests
      where friend_requests.sender_id = target_profile_id
        and friend_requests.receiver_id = auth.uid()
    ) then 'incoming_request'
    else 'none'
  end;
$$;

create or replace function public.get_mutual_friend_count(target_profile_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  with my_friends as (
    select
      case
        when friendships.user_low_id = auth.uid()
          then friendships.user_high_id
        else friendships.user_low_id
      end as friend_id
    from public.friendships
    where friendships.user_low_id = auth.uid()
      or friendships.user_high_id = auth.uid()
  ),
  target_friends as (
    select
      case
        when friendships.user_low_id = target_profile_id
          then friendships.user_high_id
        else friendships.user_low_id
      end as friend_id
    from public.friendships
    where friendships.user_low_id = target_profile_id
      or friendships.user_high_id = target_profile_id
  )
  select case
    when exists (
      select 1
      from public.profile_settings
      where profile_settings.profile_id = target_profile_id
        and profile_settings.show_mutual_friends
    )
    then (
      select count(*)
      from my_friends
      inner join target_friends using (friend_id)
    )
    else 0
  end;
$$;

create or replace function public.can_view_presence(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() = target_profile_id
    or (
      public.are_friends(target_profile_id)
      and exists (
        select 1
        from public.profile_settings
        where profile_settings.profile_id = target_profile_id
          and profile_settings.show_online_status
      )
    );
$$;

create or replace function public.search_profiles(
  search_term text,
  result_limit integer default 20
)
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  bio text,
  relationship_status text,
  mutual_friend_count bigint,
  allow_friend_requests boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_search text := public.normalize_handle(search_term);
  safe_limit integer := greatest(1, least(coalesce(result_limit, 20), 20));
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if char_length(normalized_search) < 2 then
    return;
  end if;

  return query
  select
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    profiles.bio,
    public.get_connection_status(profiles.id),
    public.get_mutual_friend_count(profiles.id),
    settings.allow_friend_requests
  from public.profiles as profiles
  inner join public.profile_settings as settings
    on settings.profile_id = profiles.id
  where profiles.id <> auth.uid()
    and settings.discoverable_by_search
    and not public.has_block_between(profiles.id)
    and (
      profiles.handle = normalized_search
      or profiles.handle like normalized_search || '%'
    )
  order by
    (profiles.handle = normalized_search) desc,
    profiles.handle
  limit safe_limit;
end;
$$;

create or replace function public.get_my_friends()
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  bio text,
  friendship_created_at timestamptz,
  presence_status text,
  is_online boolean,
  mutual_friend_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  return query
  select
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    profiles.bio,
    friendships.created_at,
    case
      when settings.show_online_status
        and presence.last_seen_at > now() - interval '2 minutes'
        and presence.status <> 'offline'
      then presence.status
      else 'offline'
    end,
    (
      settings.show_online_status
      and presence.last_seen_at > now() - interval '2 minutes'
      and presence.status <> 'offline'
    ),
    public.get_mutual_friend_count(profiles.id)
  from public.friendships
  inner join public.profiles as profiles
    on profiles.id = case
      when friendships.user_low_id = auth.uid()
        then friendships.user_high_id
      else friendships.user_low_id
    end
  inner join public.profile_settings as settings
    on settings.profile_id = profiles.id
  left join public.user_presence as presence
    on presence.profile_id = profiles.id
  where friendships.user_low_id = auth.uid()
    or friendships.user_high_id = auth.uid()
  order by
    (
      settings.show_online_status
      and presence.last_seen_at > now() - interval '2 minutes'
      and presence.status <> 'offline'
    ) desc,
    profiles.display_name,
    profiles.handle;
end;
$$;

create or replace function public.get_friend_requests(request_direction text)
returns table (
  request_id uuid,
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  bio text,
  created_at timestamptz,
  mutual_friend_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if request_direction not in ('received', 'sent') then
    raise exception using errcode = '22023', message = 'invalid_request_direction';
  end if;

  return query
  select
    requests.id,
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    profiles.bio,
    requests.created_at,
    public.get_mutual_friend_count(profiles.id)
  from public.friend_requests as requests
  inner join public.profiles as profiles
    on profiles.id = case
      when request_direction = 'received'
        then requests.sender_id
      else requests.receiver_id
    end
  where (
    request_direction = 'received'
    and requests.receiver_id = auth.uid()
  )
  or (
    request_direction = 'sent'
    and requests.sender_id = auth.uid()
  )
  order by requests.created_at desc;
end;
$$;

create or replace function public.get_blocked_profiles()
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  blocked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  return query
  select
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    blocks.created_at
  from public.user_blocks as blocks
  inner join public.profiles as profiles
    on profiles.id = blocks.blocked_id
  where blocks.blocker_id = auth.uid()
  order by blocks.created_at desc;
end;
$$;

create or replace function public.get_friend_suggestions(result_limit integer default 20)
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  bio text,
  score integer,
  shared_interest_labels text[],
  shared_category_labels text[],
  mutual_friend_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_limit integer := greatest(1, least(coalesce(result_limit, 20), 20));
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.profile_settings
    where profile_settings.profile_id = auth.uid()
      and profile_settings.use_interests_for_suggestions
  ) then
    return;
  end if;

  return query
  select
    candidates.id,
    candidates.display_name,
    candidates.handle,
    candidates.avatar_path,
    candidates.bio,
    (
      shared.interest_score
      + (public.get_mutual_friend_count(candidates.id) * 5)
    )::integer,
    shared.interest_labels,
    shared.category_labels,
    public.get_mutual_friend_count(candidates.id)
  from public.profiles as candidates
  inner join public.profile_settings as candidate_settings
    on candidate_settings.profile_id = candidates.id
  cross join lateral (
    select
      coalesce(
        sum(
          case categories.slug
            when 'musica' then 4
            when 'jogos' then 4
            when 'filmes-series' then 3
            when 'hobbies' then 3
            else 1
          end
        ),
        0
      )::integer as interest_score,
      coalesce(
        array_agg(interests.label order by categories.sort_order, interests.sort_order)
          filter (where interests.id is not null),
        '{}'::text[]
      ) as interest_labels,
      coalesce(
        array_agg(distinct categories.label order by categories.label)
          filter (where categories.id is not null),
        '{}'::text[]
      ) as category_labels
    from public.profile_interests as mine
    inner join public.profile_interests as theirs
      on theirs.interest_id = mine.interest_id
      and theirs.profile_id = candidates.id
    inner join public.interests
      on interests.id = mine.interest_id
    inner join public.interest_categories as categories
      on categories.id = interests.category_id
    where mine.profile_id = auth.uid()
  ) as shared
  where candidates.id <> auth.uid()
    and candidate_settings.discoverable_by_search
    and candidate_settings.use_interests_for_suggestions
    and candidate_settings.allow_friend_requests
    and not public.has_block_between(candidates.id)
    and not public.are_friends(candidates.id)
    and not exists (
      select 1
      from public.friend_requests
      where (
        friend_requests.sender_id = auth.uid()
        and friend_requests.receiver_id = candidates.id
      )
      or (
        friend_requests.sender_id = candidates.id
        and friend_requests.receiver_id = auth.uid()
      )
    )
    and not exists (
      select 1
      from public.dismissed_friend_suggestions
      where dismissed_friend_suggestions.profile_id = auth.uid()
        and dismissed_friend_suggestions.suggested_profile_id = candidates.id
        and (
          dismissed_friend_suggestions.hidden_until is null
          or dismissed_friend_suggestions.hidden_until > now()
        )
    )
    and (
      shared.interest_score > 0
      or public.get_mutual_friend_count(candidates.id) > 0
    )
  order by
    (
      shared.interest_score
      + (public.get_mutual_friend_count(candidates.id) * 5)
    ) desc,
    candidates.handle
  limit safe_limit;
end;
$$;

create or replace function public.get_public_profile_by_handle(target_handle text)
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  bio text,
  created_at timestamptz,
  favorite_spotify_url text,
  favorite_spotify_title text,
  relationship_status text,
  mutual_friend_count bigint,
  allow_friend_requests boolean,
  interest_labels text[],
  interest_category_labels text[]
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
    profiles.id,
    profiles.display_name,
    profiles.handle,
    profiles.avatar_path,
    profiles.bio,
    profiles.created_at,
    profiles.favorite_spotify_url,
    profiles.favorite_spotify_title,
    public.get_connection_status(profiles.id),
    public.get_mutual_friend_count(profiles.id),
    settings.allow_friend_requests,
    case
      when settings.show_interests_on_profile
        and not settings.hide_all_interests
      then coalesce(interests_data.labels, '{}'::text[])
      else '{}'::text[]
    end,
    case
      when settings.show_interests_on_profile
        and not settings.hide_all_interests
      then coalesce(interests_data.category_labels, '{}'::text[])
      else '{}'::text[]
    end
  from public.profiles as profiles
  inner join public.profile_settings as settings
    on settings.profile_id = profiles.id
  left join lateral (
    select
      array_agg(interests.label order by categories.sort_order, interests.sort_order) as labels,
      array_agg(distinct categories.label order by categories.label) as category_labels
    from public.profile_interests
    inner join public.interests
      on interests.id = profile_interests.interest_id
    inner join public.interest_categories as categories
      on categories.id = interests.category_id
    where profile_interests.profile_id = profiles.id
  ) as interests_data on true
  where profiles.handle = normalized_target
    and not public.has_block_between(profiles.id)
    and (
      profiles.id = auth.uid()
      or settings.discoverable_by_search
      or public.are_friends(profiles.id)
      or exists (
        select 1
        from public.friend_requests
        where (
          friend_requests.sender_id = auth.uid()
          and friend_requests.receiver_id = profiles.id
        )
        or (
          friend_requests.sender_id = profiles.id
          and friend_requests.receiver_id = auth.uid()
        )
      )
    )
  limit 1;
end;
$$;

create or replace function public.get_my_connection_notifications(result_limit integer default 30)
returns table (
  notification_id bigint,
  notification_type text,
  read_at timestamptz,
  created_at timestamptz,
  actor_profile_id uuid,
  actor_display_name text,
  actor_handle text,
  actor_avatar_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_limit integer := greatest(1, least(coalesce(result_limit, 30), 50));
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  return query
  select
    notifications.id,
    notifications.notification_type,
    notifications.read_at,
    notifications.created_at,
    actors.id,
    actors.display_name,
    actors.handle,
    actors.avatar_path
  from public.connection_notifications as notifications
  inner join public.profiles as actors
    on actors.id = notifications.actor_id
  where notifications.recipient_id = auth.uid()
  order by notifications.created_at desc
  limit safe_limit;
end;
$$;

create or replace function public.send_friend_request(target_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  created_request_id uuid;
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if target_profile_id is null or target_profile_id = current_profile_id then
    raise exception using errcode = '22023', message = 'cannot_request_self';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      least(current_profile_id::text, target_profile_id::text)
      || ':'
      || greatest(current_profile_id::text, target_profile_id::text),
      0
    )
  );

  if not exists (
    select 1
    from public.profiles
    where profiles.id = target_profile_id
  ) then
    raise exception using errcode = 'P0002', message = 'profile_not_found';
  end if;

  if public.has_block_between(target_profile_id) then
    raise exception using errcode = '42501', message = 'connection_blocked';
  end if;

  if public.are_friends(target_profile_id) then
    raise exception using errcode = '23505', message = 'already_friends';
  end if;

  if exists (
    select 1
    from public.friend_requests
    where (
      friend_requests.sender_id = current_profile_id
      and friend_requests.receiver_id = target_profile_id
    )
    or (
      friend_requests.sender_id = target_profile_id
      and friend_requests.receiver_id = current_profile_id
    )
  ) then
    raise exception using errcode = '23505', message = 'friend_request_exists';
  end if;

  if not exists (
    select 1
    from public.profile_settings
    where profile_settings.profile_id = target_profile_id
      and profile_settings.allow_friend_requests
  ) then
    raise exception using errcode = '42501', message = 'friend_requests_disabled';
  end if;

  insert into public.friend_requests (sender_id, receiver_id)
  values (current_profile_id, target_profile_id)
  returning id into created_request_id;

  insert into public.connection_notifications (
    recipient_id,
    actor_id,
    notification_type,
    friend_request_id
  )
  values (
    target_profile_id,
    current_profile_id,
    'friend_request',
    created_request_id
  );

  return created_request_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'friend_request_exists';
end;
$$;

create or replace function public.cancel_friend_request(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  delete from public.friend_requests
  where friend_requests.id = target_request_id
    and friend_requests.sender_id = auth.uid();

  if not found then
    raise exception using errcode = '42501', message = 'friend_request_not_owned';
  end if;
end;
$$;

create or replace function public.respond_friend_request(
  target_request_id uuid,
  accept_request boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record record;
  low_profile_id uuid;
  high_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select requests.*
  into request_record
  from public.friend_requests as requests
  where requests.id = target_request_id;

  if not found or request_record.receiver_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'friend_request_not_received';
  end if;

  low_profile_id :=
    least(request_record.sender_id::text, request_record.receiver_id::text)::uuid;
  high_profile_id :=
    greatest(request_record.sender_id::text, request_record.receiver_id::text)::uuid;

  perform pg_advisory_xact_lock(
    hashtextextended(low_profile_id::text || ':' || high_profile_id::text, 0)
  );

  select requests.*
  into request_record
  from public.friend_requests as requests
  where requests.id = target_request_id
  for update;

  if not found or request_record.receiver_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'friend_request_not_received';
  end if;

  if accept_request then
    if public.has_block_between(request_record.sender_id) then
      raise exception using errcode = '42501', message = 'connection_blocked';
    end if;

    insert into public.friendships (user_low_id, user_high_id)
    values (low_profile_id, high_profile_id)
    on conflict (user_low_id, user_high_id) do nothing;
  end if;

  delete from public.friend_requests
  where friend_requests.id = target_request_id;

  if accept_request then
    insert into public.connection_notifications (
      recipient_id,
      actor_id,
      notification_type
    )
    values (
      request_record.sender_id,
      request_record.receiver_id,
      'friend_accepted'
    );
  end if;
end;
$$;

create or replace function public.remove_friend(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  delete from public.friendships
  where friendships.user_low_id =
    least(auth.uid()::text, target_profile_id::text)::uuid
    and friendships.user_high_id =
      greatest(auth.uid()::text, target_profile_id::text)::uuid;

  if not found then
    raise exception using errcode = 'P0002', message = 'friendship_not_found';
  end if;
end;
$$;

create or replace function public.block_profile(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if target_profile_id is null or target_profile_id = current_profile_id then
    raise exception using errcode = '22023', message = 'cannot_block_self';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      least(current_profile_id::text, target_profile_id::text)
      || ':'
      || greatest(current_profile_id::text, target_profile_id::text),
      0
    )
  );

  insert into public.user_blocks (blocker_id, blocked_id)
  values (current_profile_id, target_profile_id)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.friend_requests
  where (
    friend_requests.sender_id = current_profile_id
    and friend_requests.receiver_id = target_profile_id
  )
  or (
    friend_requests.sender_id = target_profile_id
    and friend_requests.receiver_id = current_profile_id
  );

  delete from public.friendships
  where friendships.user_low_id =
    least(current_profile_id::text, target_profile_id::text)::uuid
    and friendships.user_high_id =
      greatest(current_profile_id::text, target_profile_id::text)::uuid;
end;
$$;

create or replace function public.unblock_profile(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  delete from public.user_blocks
  where user_blocks.blocker_id = auth.uid()
    and user_blocks.blocked_id = target_profile_id;
end;
$$;

create or replace function public.dismiss_friend_suggestion(
  target_profile_id uuid,
  dismiss_permanently boolean default false
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

  if target_profile_id is null or target_profile_id = auth.uid() then
    raise exception using errcode = '22023', message = 'invalid_suggestion_target';
  end if;

  insert into public.dismissed_friend_suggestions (
    profile_id,
    suggested_profile_id,
    hidden_until
  )
  values (
    auth.uid(),
    target_profile_id,
    case
      when dismiss_permanently then null
      else now() + interval '30 days'
    end
  )
  on conflict (profile_id, suggested_profile_id)
  do update set
    hidden_until = excluded.hidden_until,
    updated_at = now();
end;
$$;

create or replace function public.report_profile(
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
  current_profile_id uuid := auth.uid();
  normalized_details text := nullif(btrim(coalesce(report_details, '')), '');
  created_report_id uuid;
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if target_profile_id is null or target_profile_id = current_profile_id then
    raise exception using errcode = '22023', message = 'cannot_report_self';
  end if;

  if report_reason not in (
    'spam',
    'harassment',
    'fake_profile',
    'inappropriate_content',
    'other'
  ) then
    raise exception using errcode = '22023', message = 'invalid_report_reason';
  end if;

  if normalized_details is not null and char_length(normalized_details) > 500 then
    raise exception using errcode = '22023', message = 'report_details_too_long';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = target_profile_id
  ) then
    raise exception using errcode = 'P0002', message = 'profile_not_found';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'report:' || current_profile_id::text || ':' || target_profile_id::text,
      0
    )
  );

  if exists (
    select 1
    from public.user_reports
    where user_reports.reporter_id = current_profile_id
      and user_reports.reported_profile_id = target_profile_id
      and user_reports.created_at > now() - interval '24 hours'
  ) then
    raise exception using errcode = '23505', message = 'report_already_sent';
  end if;

  insert into public.user_reports (
    reporter_id,
    reported_profile_id,
    reason,
    details
  )
  values (
    current_profile_id,
    target_profile_id,
    report_reason,
    normalized_details
  )
  returning id into created_report_id;

  return created_report_id;
end;
$$;

create or replace function public.mark_connection_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  update public.connection_notifications
  set read_at = now()
  where connection_notifications.recipient_id = auth.uid()
    and connection_notifications.read_at is null;
end;
$$;

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

  insert into public.user_presence (profile_id, status, last_seen_at)
  values (auth.uid(), next_status, now())
  on conflict (profile_id)
  do update set
    status = excluded.status,
    last_seen_at = excluded.last_seen_at,
    updated_at = now();
end;
$$;

create or replace function public.can_start_direct_message(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and auth.uid() <> target_profile_id
    and not public.has_block_between(target_profile_id)
    and exists (
      select 1
      from public.profile_settings
      where profile_settings.profile_id = target_profile_id
        and profile_settings.allow_direct_messages
    );
$$;

alter table public.friend_requests enable row level security;
alter table public.friend_requests force row level security;
alter table public.friendships enable row level security;
alter table public.friendships force row level security;
alter table public.user_blocks enable row level security;
alter table public.user_blocks force row level security;
alter table public.dismissed_friend_suggestions enable row level security;
alter table public.dismissed_friend_suggestions force row level security;
alter table public.connection_notifications enable row level security;
alter table public.connection_notifications force row level security;
alter table public.user_reports enable row level security;
alter table public.user_reports force row level security;
alter table public.user_presence enable row level security;
alter table public.user_presence force row level security;

create policy friend_requests_read_participants
on public.friend_requests
for select
to authenticated
using (
  (select auth.uid()) = sender_id
  or (select auth.uid()) = receiver_id
);

create policy friendships_read_participants
on public.friendships
for select
to authenticated
using (
  (select auth.uid()) = user_low_id
  or (select auth.uid()) = user_high_id
);

create policy user_blocks_read_own
on public.user_blocks
for select
to authenticated
using ((select auth.uid()) = blocker_id);

create policy dismissed_suggestions_read_own
on public.dismissed_friend_suggestions
for select
to authenticated
using ((select auth.uid()) = profile_id);

create policy connection_notifications_read_own
on public.connection_notifications
for select
to authenticated
using ((select auth.uid()) = recipient_id);

create policy user_reports_read_own
on public.user_reports
for select
to authenticated
using ((select auth.uid()) = reporter_id);

create policy user_presence_read_allowed
on public.user_presence
for select
to authenticated
using (
  public.can_view_presence(profile_id)
);

revoke all on table public.friend_requests from anon, authenticated;
revoke all on table public.friendships from anon, authenticated;
revoke all on table public.user_blocks from anon, authenticated;
revoke all on table public.dismissed_friend_suggestions from anon, authenticated;
revoke all on table public.connection_notifications from anon, authenticated;
revoke all on table public.user_reports from anon, authenticated;
revoke all on table public.user_presence from anon, authenticated;

grant select on table public.friend_requests to authenticated;
grant select on table public.friendships to authenticated;
grant select on table public.user_blocks to authenticated;
grant select on table public.dismissed_friend_suggestions to authenticated;
grant select on table public.connection_notifications to authenticated;
grant select on table public.user_reports to authenticated;
grant select on table public.user_presence to authenticated;

revoke update on table public.profile_settings from authenticated;
grant update (
  onboarding_step,
  onboarding_completed_at,
  show_interests_on_profile,
  use_interests_for_suggestions,
  hide_all_interests,
  allow_friend_requests,
  allow_direct_messages,
  show_online_status,
  show_mutual_friends,
  show_mutual_servers,
  discoverable_by_search
) on public.profile_settings to authenticated;

revoke all on function public.has_block_between(uuid) from public;
revoke all on function public.are_friends(uuid) from public;
revoke all on function public.get_connection_status(uuid) from public;
revoke all on function public.get_mutual_friend_count(uuid) from public;
revoke all on function public.can_view_presence(uuid) from public;
revoke all on function public.search_profiles(text, integer) from public;
revoke all on function public.get_my_friends() from public;
revoke all on function public.get_friend_requests(text) from public;
revoke all on function public.get_blocked_profiles() from public;
revoke all on function public.get_friend_suggestions(integer) from public;
revoke all on function public.get_public_profile_by_handle(text) from public;
revoke all on function public.get_my_connection_notifications(integer) from public;
revoke all on function public.send_friend_request(uuid) from public;
revoke all on function public.cancel_friend_request(uuid) from public;
revoke all on function public.respond_friend_request(uuid, boolean) from public;
revoke all on function public.remove_friend(uuid) from public;
revoke all on function public.block_profile(uuid) from public;
revoke all on function public.unblock_profile(uuid) from public;
revoke all on function public.dismiss_friend_suggestion(uuid, boolean) from public;
revoke all on function public.report_profile(uuid, text, text) from public;
revoke all on function public.mark_connection_notifications_read() from public;
revoke all on function public.set_my_presence(text) from public;
revoke all on function public.can_start_direct_message(uuid) from public;

grant execute on function public.has_block_between(uuid) to authenticated;
grant execute on function public.are_friends(uuid) to authenticated;
grant execute on function public.get_connection_status(uuid) to authenticated;
grant execute on function public.get_mutual_friend_count(uuid) to authenticated;
grant execute on function public.can_view_presence(uuid) to authenticated;
grant execute on function public.search_profiles(text, integer) to authenticated;
grant execute on function public.get_my_friends() to authenticated;
grant execute on function public.get_friend_requests(text) to authenticated;
grant execute on function public.get_blocked_profiles() to authenticated;
grant execute on function public.get_friend_suggestions(integer) to authenticated;
grant execute on function public.get_public_profile_by_handle(text) to authenticated;
grant execute on function public.get_my_connection_notifications(integer) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_profile(uuid) to authenticated;
grant execute on function public.unblock_profile(uuid) to authenticated;
grant execute on function public.dismiss_friend_suggestion(uuid, boolean) to authenticated;
grant execute on function public.report_profile(uuid, text, text) to authenticated;
grant execute on function public.mark_connection_notifications_read() to authenticated;
grant execute on function public.set_my_presence(text) to authenticated;
grant execute on function public.can_start_direct_message(uuid) to authenticated;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    begin
      alter publication supabase_realtime add table public.friend_requests;
    exception
      when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.friendships;
    exception
      when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.user_blocks;
    exception
      when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.connection_notifications;
    exception
      when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.user_presence;
    exception
      when duplicate_object then null;
    end;
  end if;
end;
$$;

comment on table public.friendships is
  'Cada amizade usa um único par canônico ordenado, sem duplicação por direção.';
comment on table public.user_blocks is
  'Bloqueios unidirecionais. Ações de conexão consultam os dois sentidos.';
comment on table public.user_reports is
  'Denúncias privadas com limite de repetição. A moderação será conectada em fase própria.';
comment on function public.get_friend_suggestions(integer) is
  'Pontuação transparente calculada no banco por interesses e amigos em comum; nunca aceita score do cliente.';
comment on function public.can_start_direct_message(uuid) is
  'Barreira reutilizável para a futura fase de DMs, respeitando bloqueio e privacidade.';
