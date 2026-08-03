set lock_timeout = '5s';
set statement_timeout = '90s';

alter table public.profiles
add column avatar_position_x real not null default 50,
add column avatar_position_y real not null default 50,
add column avatar_zoom real not null default 1,
add column banner_position_x real not null default 50,
add column banner_position_y real not null default 50,
add column banner_zoom real not null default 1,
add column profile_gradient_start text,
add column profile_gradient_end text,
add column profile_gradient_angle smallint not null default 135;

alter table public.profiles
add constraint profiles_avatar_position_x_check check (avatar_position_x between 0 and 100),
add constraint profiles_avatar_position_y_check check (avatar_position_y between 0 and 100),
add constraint profiles_avatar_zoom_check check (avatar_zoom between 1 and 3),
add constraint profiles_banner_position_x_check check (banner_position_x between 0 and 100),
add constraint profiles_banner_position_y_check check (banner_position_y between 0 and 100),
add constraint profiles_banner_zoom_check check (banner_zoom between 1 and 3),
add constraint profiles_gradient_start_check check (profile_gradient_start is null or profile_gradient_start ~ '^#[0-9A-Fa-f]{6}$'),
add constraint profiles_gradient_end_check check (profile_gradient_end is null or profile_gradient_end ~ '^#[0-9A-Fa-f]{6}$'),
add constraint profiles_gradient_pair_check check ((profile_gradient_start is null) = (profile_gradient_end is null)),
add constraint profiles_gradient_angle_check check (profile_gradient_angle between 0 and 360);

create table public.arcana_subscriptions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','canceled','expired')),
  provider text not null default 'manual' check (provider in ('manual','mercado_pago','stripe')),
  provider_customer_id text,
  provider_subscription_id text,
  started_at timestamptz,
  current_period_started_at timestamptz,
  current_period_ends_at timestamptz,
  consecutive_months integer not null default 0 check (consecutive_months >= 0),
  grace_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index arcana_subscriptions_provider_subscription_unique on public.arcana_subscriptions(provider, provider_subscription_id) where provider_subscription_id is not null;

create table public.server_arcana_runes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rune_slot smallint not null check (rune_slot between 1 and 3),
  server_id uuid not null references public.servers(id) on delete cascade,
  applied_at timestamptz not null default now(),
  primary key(profile_id, rune_slot)
);
create index server_arcana_runes_server_idx on public.server_arcana_runes(server_id, applied_at);

create table public.external_connections (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('spotify','steam','youtube')),
  external_user_id text not null,
  display_name text not null,
  profile_url text check (profile_url is null or profile_url ~ '^https://'),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  show_on_profile boolean not null default true,
  show_activity boolean not null default false,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(profile_id, provider)
);

create table public.profile_activities (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null check (provider = 'spotify'),
  activity_type text not null check (activity_type = 'listening'),
  title text not null,
  subtitle text,
  image_url text,
  external_url text,
  started_at timestamptz,
  ends_at timestamptz,
  refreshed_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.arcana_subscriptions enable row level security;
alter table public.arcana_subscriptions force row level security;
alter table public.server_arcana_runes enable row level security;
alter table public.server_arcana_runes force row level security;
alter table public.external_connections enable row level security;
alter table public.external_connections force row level security;
alter table public.profile_activities enable row level security;
alter table public.profile_activities force row level security;

create policy arcana_subscriptions_read_own on public.arcana_subscriptions for select to authenticated using(profile_id = auth.uid());
create policy server_arcana_runes_read_members on public.server_arcana_runes for select to authenticated using(public.is_server_member(server_id));
create policy external_connections_read_own on public.external_connections for select to authenticated using(profile_id = auth.uid());
create policy external_connections_update_own_visibility on public.external_connections for update to authenticated using(profile_id = auth.uid()) with check(profile_id = auth.uid());
create policy external_connections_delete_own on public.external_connections for delete to authenticated using(profile_id = auth.uid());
create policy profile_activities_read_own on public.profile_activities for select to authenticated using(profile_id = auth.uid());

revoke all on table public.arcana_subscriptions, public.server_arcana_runes, public.external_connections, public.profile_activities from anon, authenticated;
grant select on table public.arcana_subscriptions, public.server_arcana_runes, public.profile_activities to authenticated;
grant select, update(show_on_profile, show_activity), delete on table public.external_connections to authenticated;

create or replace function public.has_active_arcana(target_profile_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.arcana_subscriptions where profile_id = target_profile_id and status in ('active','trialing') and coalesce(current_period_ends_at, grace_ends_at) > now());
$$;

create or replace function public.get_arcana_tier(consecutive_months integer) returns table(tier_number integer, tier_name text, tier_color text) language sql immutable set search_path = '' as $$
  select greatest(1,least(12,consecutive_months)),
    (array['Centelha','Runa','Orbe','Prisma','Éter','Eclipse','Astral','Arcano','Celestial','Ancestral','Lendário','Eterno'])[greatest(1,least(12,consecutive_months))],
    (array['#8B5CF6','#6366F1','#3B82F6','#06B6D4','#14B8A6','#D946EF','#EC4899','#7C3AED','#FBBF24','#F97316','#CBD5E1','#A78BFA'])[greatest(1,least(12,consecutive_months))];
$$;

create or replace function public.get_my_arcana_membership() returns table(is_active boolean,status text,consecutive_months integer,tier_number integer,tier_name text,tier_color text,current_period_ends_at timestamptz,available_runes integer) language plpgsql stable security definer set search_path = '' as $$
declare subscription_row public.arcana_subscriptions%rowtype; used_runes integer;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='authentication_required'; end if;
  select * into subscription_row from public.arcana_subscriptions where profile_id=auth.uid();
  select count(*)::integer into used_runes from public.server_arcana_runes where profile_id=auth.uid();
  return query select public.has_active_arcana(auth.uid()),coalesce(subscription_row.status,'inactive'),coalesce(subscription_row.consecutive_months,0),tier.tier_number,tier.tier_name,tier.tier_color,subscription_row.current_period_ends_at,greatest(0,3-used_runes) from public.get_arcana_tier(greatest(1,coalesce(subscription_row.consecutive_months,1))) tier;
end; $$;

create or replace function public.save_my_profile_media(media_kind text,media_path text,position_x real default 50,position_y real default 50,zoom_level real default 1) returns text language plpgsql security definer set search_path='' as $$
declare previous_path text; expected_prefix text:=auth.uid()::text||'/';
begin
  if auth.uid() is null then raise exception using errcode='42501',message='authentication_required'; end if;
  if media_kind not in ('avatar','banner') or position_x not between 0 and 100 or position_y not between 0 and 100 or zoom_level not between 1 and 3 or media_path not like expected_prefix||media_kind||'-%' or media_path !~ '\.(jpg|jpeg|png|webp|gif)$' then raise exception using errcode='22023',message='invalid_profile_media'; end if;
  if media_path ~ '\.gif$' and not public.has_active_arcana(auth.uid()) then raise exception using errcode='42501',message='arcana_required'; end if;
  if media_kind='avatar' then select avatar_path into previous_path from public.profiles where id=auth.uid(); update public.profiles set avatar_path=media_path,avatar_position_x=position_x,avatar_position_y=position_y,avatar_zoom=zoom_level where id=auth.uid();
  else select banner_path into previous_path from public.profiles where id=auth.uid(); update public.profiles set banner_path=media_path,banner_position_x=position_x,banner_position_y=position_y,banner_zoom=zoom_level where id=auth.uid(); end if;
  return previous_path;
end; $$;

create or replace function public.set_my_profile_gradient(gradient_start text,gradient_end text,gradient_angle smallint) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_active_arcana(auth.uid()) then raise exception using errcode='42501',message='arcana_required'; end if;
  if gradient_start !~ '^#[0-9A-Fa-f]{6}$' or gradient_end !~ '^#[0-9A-Fa-f]{6}$' or gradient_angle not between 0 and 360 then raise exception using errcode='22023',message='invalid_profile_gradient'; end if;
  update public.profiles set profile_gradient_start=upper(gradient_start),profile_gradient_end=upper(gradient_end),profile_gradient_angle=gradient_angle where id=auth.uid();
end; $$;

create or replace function public.clear_my_profile_gradient() returns void language sql security definer set search_path='' as $$ update public.profiles set profile_gradient_start=null,profile_gradient_end=null,profile_gradient_angle=135 where id=auth.uid(); $$;

create or replace function public.enforce_arcana_profile_visuals() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if ((new.avatar_path is distinct from old.avatar_path and new.avatar_path ~ '\.gif$') or (new.banner_path is distinct from old.banner_path and new.banner_path ~ '\.gif$') or new.profile_gradient_start is distinct from old.profile_gradient_start or new.profile_gradient_end is distinct from old.profile_gradient_end or new.profile_gradient_angle is distinct from old.profile_gradient_angle) and not public.has_active_arcana(new.id) then raise exception using errcode='42501',message='arcana_required'; end if;
  return new;
end; $$;
create trigger profiles_enforce_arcana_visuals before update on public.profiles for each row execute function public.enforce_arcana_profile_visuals();

create or replace function public.apply_arcana_rune(target_server_id uuid,target_slot smallint) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_active_arcana(auth.uid()) then raise exception using errcode='42501',message='arcana_required'; end if;
  if target_slot not between 1 and 3 or not public.is_server_member(target_server_id) then raise exception using errcode='42501',message='server_access_denied'; end if;
  insert into public.server_arcana_runes(profile_id,rune_slot,server_id) values(auth.uid(),target_slot,target_server_id) on conflict(profile_id,rune_slot) do update set server_id=excluded.server_id,applied_at=now();
end; $$;
create or replace function public.remove_arcana_rune(target_slot smallint) returns void language sql security definer set search_path='' as $$ delete from public.server_arcana_runes where profile_id=auth.uid() and rune_slot=target_slot; $$;

create or replace function public.get_server_arcana_status(target_server_id uuid) returns table(rune_count bigint,circle_level integer,circle_name text) language plpgsql stable security definer set search_path='' as $$
declare total_runes bigint; begin if not public.is_server_member(target_server_id) then raise exception using errcode='42501',message='server_access_denied'; end if; select count(*) into total_runes from public.server_arcana_runes where server_id=target_server_id; return query select total_runes,case when total_runes>=15 then 3 when total_runes>=7 then 2 when total_runes>=3 then 1 else 0 end,case when total_runes>=15 then 'Círculo Arcano' when total_runes>=7 then 'Círculo Elevado' when total_runes>=3 then 'Círculo Desperto' else 'Sem Círculo' end; end; $$;

create or replace function public.get_my_attachment_limit() returns integer language sql stable security definer set search_path='' as $$ select case when public.has_active_arcana(auth.uid()) then 26214400 else 5242880 end; $$;
alter table public.message_attachments drop constraint if exists message_attachments_size;
alter table public.message_attachments add constraint message_attachments_size check(size_bytes between 1 and 26214400);
alter table public.direct_message_attachments drop constraint if exists direct_message_attachments_size;
alter table public.direct_message_attachments add constraint direct_message_attachments_size check(size_bytes between 1 and 26214400);
update storage.buckets set file_size_limit=26214400 where id in ('message-attachments','direct-message-attachments');

do $$ declare function_record record; definition text; begin
  for function_record in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('send_channel_message','send_direct_message') loop
    definition:=pg_get_functiondef(function_record.oid);
    definition:=replace(definition,'not between 1 and 5242880','not between 1 and public.get_my_attachment_limit()');
    execute definition;
  end loop;
end $$;

drop function if exists public.get_public_profile_by_handle(text);
create function public.get_public_profile_by_handle(target_handle text)
returns table(profile_id uuid,display_name text,handle text,avatar_path text,avatar_position_x real,avatar_position_y real,avatar_zoom real,banner_path text,banner_position_x real,banner_position_y real,banner_zoom real,profile_effect text,profile_gradient_start text,profile_gradient_end text,profile_gradient_angle smallint,arcana_active boolean,arcana_months integer,arcana_tier_name text,arcana_tier_color text,bio text,created_at timestamptz,favorite_spotify_url text,favorite_spotify_title text,relationship_status text,mutual_friend_count bigint,allow_friend_requests boolean,interest_labels text[],interest_category_labels text[],connected_accounts jsonb,current_activity jsonb)
language plpgsql stable security definer set search_path='' as $$
declare normalized_target text:=public.normalize_handle(target_handle);
begin
  if auth.uid() is null then raise exception using errcode='42501',message='authentication_required'; end if;
  return query select p.id,p.display_name,p.handle,p.avatar_path,p.avatar_position_x,p.avatar_position_y,p.avatar_zoom,p.banner_path,p.banner_position_x,p.banner_position_y,p.banner_zoom,p.profile_effect,p.profile_gradient_start,p.profile_gradient_end,p.profile_gradient_angle,public.has_active_arcana(p.id),coalesce(s.consecutive_months,0),tier.tier_name,tier.tier_color,p.bio,p.created_at,p.favorite_spotify_url,p.favorite_spotify_title,public.get_connection_status(p.id),public.get_mutual_friend_count(p.id),settings.allow_friend_requests,
    case when settings.show_interests_on_profile and not settings.hide_all_interests then coalesce(interests_data.labels,'{}'::text[]) else '{}'::text[] end,
    case when settings.show_interests_on_profile and not settings.hide_all_interests then coalesce(interests_data.category_labels,'{}'::text[]) else '{}'::text[] end,
    coalesce(connections_data.items,'[]'::jsonb),activity_data.item
  from public.profiles p
  join public.profile_settings settings on settings.profile_id=p.id
  left join public.arcana_subscriptions s on s.profile_id=p.id
  left join lateral public.get_arcana_tier(greatest(1,coalesce(s.consecutive_months,1))) tier on true
  left join lateral(select array_agg(i.label order by c.sort_order,i.sort_order) labels,array_agg(distinct c.label order by c.label) category_labels from public.profile_interests pi join public.interests i on i.id=pi.interest_id join public.interest_categories c on c.id=i.category_id where pi.profile_id=p.id) interests_data on true
  left join lateral(select jsonb_agg(jsonb_build_object('provider',ec.provider,'display_name',ec.display_name,'profile_url',ec.profile_url,'avatar_url',ec.avatar_url) order by ec.provider) items from public.external_connections ec where ec.profile_id=p.id and ec.show_on_profile) connections_data on true
  left join lateral(select jsonb_build_object('provider',a.provider,'type',a.activity_type,'title',a.title,'subtitle',a.subtitle,'image_url',a.image_url,'external_url',a.external_url,'started_at',a.started_at,'ends_at',a.ends_at) item from public.profile_activities a join public.external_connections ec on ec.profile_id=a.profile_id and ec.provider=a.provider and ec.show_activity where a.profile_id=p.id and a.expires_at>now()) activity_data on true
  where p.handle=normalized_target and not public.has_block_between(p.id) and (p.id=auth.uid() or settings.discoverable_by_search or public.are_friends(p.id) or exists(select 1 from public.friend_requests fr where (fr.sender_id=auth.uid() and fr.receiver_id=p.id) or (fr.sender_id=p.id and fr.receiver_id=auth.uid()))) limit 1;
end; $$;

revoke all on function public.has_active_arcana(uuid),public.get_arcana_tier(integer),public.get_my_arcana_membership(),public.save_my_profile_media(text,text,real,real,real),public.set_my_profile_gradient(text,text,smallint),public.clear_my_profile_gradient(),public.enforce_arcana_profile_visuals(),public.apply_arcana_rune(uuid,smallint),public.remove_arcana_rune(smallint),public.get_server_arcana_status(uuid),public.get_my_attachment_limit() from public,anon;
grant execute on function public.has_active_arcana(uuid),public.get_arcana_tier(integer),public.get_my_arcana_membership(),public.save_my_profile_media(text,text,real,real,real),public.set_my_profile_gradient(text,text,smallint),public.clear_my_profile_gradient(),public.apply_arcana_rune(uuid,smallint),public.remove_arcana_rune(smallint),public.get_server_arcana_status(uuid),public.get_my_attachment_limit() to authenticated;
grant execute on function public.get_public_profile_by_handle(text) to authenticated;

comment on table public.arcana_subscriptions is 'Estado de assinatura Arcana escrito somente pelo backend de cobrança.';
comment on table public.server_arcana_runes is 'Três Runas de Comunidade simultâneas por assinatura Arcana ativa.';
comment on table public.external_connections is 'Identidades públicas confirmadas por OAuth/OpenID; tokens não são expostos ao cliente.';
