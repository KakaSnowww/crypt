set lock_timeout = '5s';
set statement_timeout = '60s';

alter table public.profiles
rename column avatar_url to avatar_path;

alter table public.profiles
add column favorite_spotify_url text,
add column favorite_spotify_title text,
add column favorite_spotify_thumbnail_url text;

alter table public.profiles
add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 280),
add constraint profiles_bio_trimmed
  check (bio is null or bio = btrim(bio)),
add constraint profiles_avatar_path_own_folder
  check (
    avatar_path is null
    or (
      split_part(avatar_path, '/', 1) = id::text
      and avatar_path ~ '^[0-9a-f-]{36}/avatar-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
    )
  ),
add constraint profiles_spotify_track_url
  check (
    favorite_spotify_url is null
    or favorite_spotify_url ~ '^https://open\.spotify\.com/track/[A-Za-z0-9]{22}$'
  ),
add constraint profiles_spotify_title_length
  check (
    favorite_spotify_title is null
    or char_length(favorite_spotify_title) between 1 and 200
  ),
add constraint profiles_spotify_thumbnail_url
  check (
    favorite_spotify_thumbnail_url is null
    or favorite_spotify_thumbnail_url ~ '^https://i\.scdn\.co/image/[A-Za-z0-9]+$'
  ),
add constraint profiles_spotify_fields_consistent
  check (
    (
      favorite_spotify_url is null
      and favorite_spotify_title is null
      and favorite_spotify_thumbnail_url is null
    )
    or (
      favorite_spotify_url is not null
      and favorite_spotify_title is not null
    )
  );

create table public.profile_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  onboarding_step smallint not null default 0,
  onboarding_completed_at timestamptz,
  show_interests_on_profile boolean not null default false,
  use_interests_for_suggestions boolean not null default false,
  hide_all_interests boolean not null default false,
  allow_friend_requests boolean not null default true,
  allow_direct_messages boolean not null default true,
  show_online_status boolean not null default true,
  show_mutual_friends boolean not null default true,
  show_mutual_servers boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_settings_onboarding_step_range
    check (onboarding_step between 0 and 8)
);

comment on table public.profile_settings is
  'Preferências de privacidade e progresso do onboarding. Não contém e-mail nem credenciais.';

create trigger profile_settings_set_updated_at
before update on public.profile_settings
for each row
execute function public.set_profile_updated_at();

create table public.interest_categories (
  id smallint generated always as identity primary key,
  slug text not null unique,
  label text not null,
  description text not null,
  sort_order smallint not null unique,
  constraint interest_categories_slug_format
    check (slug ~ '^[a-z0-9-]{2,32}$'),
  constraint interest_categories_label_length
    check (char_length(label) between 2 and 48),
  constraint interest_categories_description_length
    check (char_length(description) between 2 and 160)
);

create table public.interests (
  id bigint generated always as identity primary key,
  category_id smallint not null references public.interest_categories (id) on delete restrict,
  slug text not null,
  label text not null,
  sort_order smallint not null,
  constraint interests_slug_format
    check (slug ~ '^[a-z0-9-]{2,48}$'),
  constraint interests_label_length
    check (char_length(label) between 2 and 64),
  constraint interests_category_slug_unique
    unique (category_id, slug),
  constraint interests_category_order_unique
    unique (category_id, sort_order)
);

create index interests_category_id_idx
  on public.interests (category_id, sort_order);

create table public.profile_interests (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  interest_id bigint not null references public.interests (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (profile_id, interest_id)
);

create index profile_interests_interest_id_idx
  on public.profile_interests (interest_id, profile_id);

insert into public.interest_categories (slug, label, description, sort_order)
values
  ('musica', 'Música', 'Sons e estilos que fazem parte do seu dia.', 1),
  ('filmes-series', 'Filmes e séries', 'Histórias e gêneros que prendem sua atenção.', 2),
  ('jogos', 'Jogos', 'Experiências que você gosta de jogar e compartilhar.', 3),
  ('hobbies', 'Hobbies', 'Atividades que fazem seu tempo valer a pena.', 4),
  (
    'personalidade',
    'Personalidade',
    'Autodescrições opcionais, sem diagnóstico ou rótulo definitivo.',
    5
  );

insert into public.interests (category_id, slug, label, sort_order)
select category.id, seed.slug, seed.label, seed.sort_order
from public.interest_categories as category
cross join lateral (
  values
    ('rock', 'Rock', 1),
    ('pop', 'Pop', 2),
    ('rap', 'Rap', 3),
    ('trap', 'Trap', 4),
    ('mpb', 'MPB', 5),
    ('eletronica', 'Eletrônica', 6),
    ('funk', 'Funk', 7),
    ('sertanejo', 'Sertanejo', 8),
    ('jazz', 'Jazz', 9),
    ('musica-classica', 'Música clássica', 10),
    ('indie', 'Indie', 11),
    ('metal', 'Metal', 12),
    ('k-pop', 'K-pop', 13),
    ('reggae', 'Reggae', 14),
    ('lo-fi', 'Lo-fi', 15)
) as seed(slug, label, sort_order)
where category.slug = 'musica';

insert into public.interests (category_id, slug, label, sort_order)
select category.id, seed.slug, seed.label, seed.sort_order
from public.interest_categories as category
cross join lateral (
  values
    ('acao', 'Ação', 1),
    ('comedia', 'Comédia', 2),
    ('terror', 'Terror', 3),
    ('suspense', 'Suspense', 4),
    ('ficcao-cientifica', 'Ficção científica', 5),
    ('fantasia', 'Fantasia', 6),
    ('romance', 'Romance', 7),
    ('animacao', 'Animação', 8),
    ('documentario', 'Documentário', 9),
    ('drama', 'Drama', 10),
    ('misterio', 'Mistério', 11),
    ('anime', 'Anime', 12)
) as seed(slug, label, sort_order)
where category.slug = 'filmes-series';

insert into public.interests (category_id, slug, label, sort_order)
select category.id, seed.slug, seed.label, seed.sort_order
from public.interest_categories as category
cross join lateral (
  values
    ('fps', 'FPS', 1),
    ('rpg', 'RPG', 2),
    ('estrategia', 'Estratégia', 3),
    ('sobrevivencia', 'Sobrevivência', 4),
    ('corrida', 'Corrida', 5),
    ('simulacao', 'Simulação', 6),
    ('casuais', 'Jogos casuais', 7),
    ('competitivos', 'Jogos competitivos', 8),
    ('cooperativos', 'Jogos cooperativos', 9),
    ('terror', 'Jogos de terror', 10),
    ('independentes', 'Jogos independentes', 11)
) as seed(slug, label, sort_order)
where category.slug = 'jogos';

insert into public.interests (category_id, slug, label, sort_order)
select category.id, seed.slug, seed.label, seed.sort_order
from public.interest_categories as category
cross join lateral (
  values
    ('programacao', 'Programação', 1),
    ('desenho', 'Desenho', 2),
    ('fotografia', 'Fotografia', 3),
    ('leitura', 'Leitura', 4),
    ('escrita', 'Escrita', 5),
    ('musica', 'Música', 6),
    ('academia', 'Academia', 7),
    ('esportes', 'Esportes', 8),
    ('culinaria', 'Culinária', 9),
    ('viagens', 'Viagens', 10),
    ('tecnologia', 'Tecnologia', 11),
    ('criacao-conteudo', 'Criação de conteúdo', 12),
    ('colecionismo', 'Colecionismo', 13)
) as seed(slug, label, sort_order)
where category.slug = 'hobbies';

insert into public.interests (category_id, slug, label, sort_order)
select category.id, seed.slug, seed.label, seed.sort_order
from public.interest_categories as category
cross join lateral (
  values
    ('timido', 'Tímido', 1),
    ('comunicativo', 'Comunicativo', 2),
    ('calmo', 'Calmo', 3),
    ('animado', 'Animado', 4),
    ('criativo', 'Criativo', 5),
    ('curioso', 'Curioso', 6),
    ('competitivo', 'Competitivo', 7),
    ('prestativo', 'Prestativo', 8),
    ('engracado', 'Engraçado', 9),
    ('reservado', 'Reservado', 10),
    ('organizado', 'Organizado', 11),
    ('espontaneo', 'Espontâneo', 12)
) as seed(slug, label, sort_order)
where category.slug = 'personalidade';

insert into public.profile_settings (profile_id)
select profiles.id
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

  return new;
exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'handle_unavailable';
end;
$$;

create or replace function public.set_profile_interests(
  category_slug text,
  selected_interest_ids bigint[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  requested_ids bigint[] := coalesce(selected_interest_ids, '{}'::bigint[]);
  target_category_id smallint;
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select categories.id
  into target_category_id
  from public.interest_categories as categories
  where categories.slug = category_slug;

  if target_category_id is null then
    raise exception using errcode = '22023', message = 'invalid_interest_category';
  end if;

  if exists (
    select 1
    from unnest(requested_ids) as requested(interest_id)
    left join public.interests
      on interests.id = requested.interest_id
    where interests.id is null
      or interests.category_id <> target_category_id
  ) then
    raise exception using errcode = '22023', message = 'invalid_interest_selection';
  end if;

  delete from public.profile_interests
  using public.interests
  where profile_interests.profile_id = current_profile_id
    and profile_interests.interest_id = interests.id
    and interests.category_id = target_category_id;

  insert into public.profile_interests (profile_id, interest_id)
  select current_profile_id, requested.interest_id
  from (
    select distinct unnest(requested_ids) as interest_id
  ) as requested;
end;
$$;

create or replace function public.replace_my_interests(selected_interest_ids bigint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  requested_ids bigint[] := coalesce(selected_interest_ids, '{}'::bigint[]);
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if exists (
    select 1
    from unnest(requested_ids) as requested(interest_id)
    left join public.interests
      on interests.id = requested.interest_id
    where interests.id is null
  ) then
    raise exception using errcode = '22023', message = 'invalid_interest_selection';
  end if;

  delete from public.profile_interests
  where profile_interests.profile_id = current_profile_id;

  insert into public.profile_interests (profile_id, interest_id)
  select current_profile_id, requested.interest_id
  from (
    select distinct unnest(requested_ids) as interest_id
  ) as requested;
end;
$$;

create or replace function public.can_view_profile_interests(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() = target_profile_id
    or exists (
      select 1
      from public.profile_settings
      where profile_settings.profile_id = target_profile_id
        and profile_settings.show_interests_on_profile
        and not profile_settings.hide_all_interests
    );
$$;

alter table public.profile_settings enable row level security;
alter table public.profile_settings force row level security;
alter table public.interest_categories enable row level security;
alter table public.interest_categories force row level security;
alter table public.interests enable row level security;
alter table public.interests force row level security;
alter table public.profile_interests enable row level security;
alter table public.profile_interests force row level security;

create policy profile_settings_read_own
on public.profile_settings
for select
to authenticated
using ((select auth.uid()) = profile_id);

create policy profile_settings_update_own
on public.profile_settings
for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

create policy interest_categories_read_authenticated
on public.interest_categories
for select
to authenticated
using (true);

create policy interests_read_authenticated
on public.interests
for select
to authenticated
using (true);

create policy profile_interests_read_visible
on public.profile_interests
for select
to authenticated
using (public.can_view_profile_interests(profile_id));

revoke all on table public.profile_settings from anon, authenticated;
revoke all on table public.interest_categories from anon, authenticated;
revoke all on table public.interests from anon, authenticated;
revoke all on table public.profile_interests from anon, authenticated;

grant select on table public.profile_settings to authenticated;
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
  show_mutual_servers
) on public.profile_settings to authenticated;
grant select on table public.interest_categories to authenticated;
grant select on table public.interests to authenticated;
grant select on table public.profile_interests to authenticated;

revoke all on function public.set_profile_interests(text, bigint[]) from public;
revoke all on function public.replace_my_interests(bigint[]) from public;
revoke all on function public.can_view_profile_interests(uuid) from public;
grant execute on function public.set_profile_interests(text, bigint[]) to authenticated;
grant execute on function public.replace_my_interests(bigint[]) to authenticated;
grant execute on function public.can_view_profile_interests(uuid) to authenticated;

revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (
  display_name,
  handle,
  avatar_path,
  bio,
  favorite_spotify_url,
  favorite_spotify_title,
  favorite_spotify_thumbnail_url
) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy crypt_profile_media_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
);

create policy crypt_profile_media_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy crypt_profile_media_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
);

create policy crypt_profile_media_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

comment on function public.set_profile_interests(text, bigint[]) is
  'Substitui atomicamente os interesses do usuário autenticado em uma categoria.';
comment on function public.replace_my_interests(bigint[]) is
  'Substitui atomicamente toda a seleção de interesses do usuário autenticado.';
comment on function public.can_view_profile_interests(uuid) is
  'Decide no banco se a seleção de interesses pode ser vista pela sessão atual.';
