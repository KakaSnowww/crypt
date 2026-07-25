set lock_timeout = '5s';
set statement_timeout = '30s';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  handle text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (char_length(display_name) between 2 and 48),
  constraint profiles_display_name_trimmed
    check (display_name = btrim(display_name)),
  constraint profiles_display_name_no_control_characters
    check (display_name !~ '[[:cntrl:]]'),
  constraint profiles_handle_format
    check (handle ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_handle_lowercase
    check (handle = lower(handle)),
  constraint profiles_handle_not_reserved
    check (
      handle <> all (
        array[
          'admin',
          'administrador',
          'crypt',
          'everyone',
          'here',
          'moderacao',
          'oficial',
          'sistema',
          'suporte'
        ]::text[]
      )
    ),
  constraint profiles_handle_unique unique (handle)
);

comment on table public.profiles is
  'Dados públicos mínimos do usuário. E-mail e senha permanecem exclusivamente no Supabase Auth.';
comment on column public.profiles.handle is
  'Identificador único normalizado, armazenado sem o prefixo @.';

create index profiles_handle_prefix_idx
  on public.profiles (handle text_pattern_ops);

create or replace function public.normalize_handle(candidate text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(regexp_replace(btrim(candidate), '^@', ''));
$$;

create or replace function public.is_handle_available(candidate_handle text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_handle text := public.normalize_handle(candidate_handle);
begin
  if normalized_handle !~ '^[a-z0-9_]{3,24}$' then
    return false;
  end if;

  if normalized_handle = any (
    array[
      'admin',
      'administrador',
      'crypt',
      'everyone',
      'here',
      'moderacao',
      'oficial',
      'sistema',
      'suporte'
    ]::text[]
  ) then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles
    where profiles.handle = normalized_handle
  );
end;
$$;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

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

  return new;
exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'handle_unavailable';
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy profiles_read_public_fields
on public.profiles
for select
to authenticated
using (true);

comment on policy profiles_read_public_fields on public.profiles is
  'Perfis contêm somente dados de diretório público e são visíveis apenas para usuários autenticados.';

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, handle, avatar_url, bio) on table public.profiles to authenticated;

revoke all on function public.normalize_handle(text) from public;
revoke all on function public.is_handle_available(text) from public;
revoke all on function public.set_profile_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;

grant execute on function public.normalize_handle(text) to anon, authenticated;
grant execute on function public.is_handle_available(text) to anon, authenticated;

comment on function public.is_handle_available(text) is
  'Valida formato, nomes reservados e disponibilidade do identificador sem expor dados privados.';
