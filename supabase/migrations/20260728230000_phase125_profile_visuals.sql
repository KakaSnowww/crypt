alter table public.profiles
add column banner_path text,
add column profile_effect text not null default 'none';

alter table public.profiles
add constraint profiles_banner_path_own_folder
check (
  banner_path is null
  or (
    split_part(banner_path, '/', 1) = id::text
    and banner_path ~ '^[0-9a-f-]{36}/banner-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  )
),
add constraint profiles_profile_effect_valid
check (profile_effect in ('none', 'aurora', 'neon', 'pulse'));

grant update (banner_path, profile_effect) on public.profiles to authenticated;

update storage.buckets
set file_size_limit = 5242880
where id = 'profile-media';

drop function if exists public.get_public_profile_by_handle(text);

create function public.get_public_profile_by_handle(target_handle text)
returns table (
  profile_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  banner_path text,
  profile_effect text,
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
    profiles.banner_path,
    profiles.profile_effect,
    profiles.bio,
    profiles.created_at,
    profiles.favorite_spotify_url,
    profiles.favorite_spotify_title,
    public.get_connection_status(profiles.id),
    public.get_mutual_friend_count(profiles.id),
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
    end
  from public.profiles as profiles
  inner join public.profile_settings as settings on settings.profile_id = profiles.id
  left join lateral (
    select
      array_agg(interests.label order by categories.sort_order, interests.sort_order) as labels,
      array_agg(distinct categories.label order by categories.label) as category_labels
    from public.profile_interests
    inner join public.interests on interests.id = profile_interests.interest_id
    inner join public.interest_categories as categories on categories.id = interests.category_id
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

revoke all on function public.get_public_profile_by_handle(text) from public;
grant execute on function public.get_public_profile_by_handle(text) to authenticated;

comment on column public.profiles.banner_path is
  'Caminho do banner no bucket profile-media; a imagem também ambienta o cartão de voz.';
comment on column public.profiles.profile_effect is
  'Efeito visual decorativo escolhido para perfil e chamadas.';
