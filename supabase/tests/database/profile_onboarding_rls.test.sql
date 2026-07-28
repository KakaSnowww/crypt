begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

select has_table('public', 'profile_settings', 'profile_settings existe');
select has_table('public', 'interest_categories', 'interest_categories existe');
select has_table('public', 'interests', 'interests existe');
select has_table('public', 'profile_interests', 'profile_interests existe');
select has_column('public', 'profiles', 'avatar_path', 'profiles armazena somente o caminho do avatar');
select has_column('public', 'profiles', 'banner_path', 'profiles armazena o caminho validado do banner');
select has_column('public', 'profiles', 'profile_effect', 'profiles armazena um efeito visual controlado');
select hasnt_column('public', 'profiles', 'email', 'o perfil público não contém e-mail');
select is(
  (select count(*)::integer from public.interest_categories),
  5,
  'o catálogo possui cinco categorias controladas'
);
select is(
  (select count(*)::integer from public.interests),
  63,
  'o catálogo possui somente os 63 itens definidos para a fase'
);
select ok(
  (
    select buckets.public
      and buckets.file_size_limit = 5242880
    from storage.buckets as buckets
    where buckets.id = 'profile-media'
  ),
  'o bucket público comporta banners de até 5 MB'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
(
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'kaio.phase4@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Kaio Snow","handle":"kaiophase4"}'::jsonb,
  now(),
  now()
),
(
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'luna.phase4@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Luna Crypt","handle":"lunaphase4"}'::jsonb,
  now(),
  now()
);

select is(
  (
    select count(*)::integer
    from public.profile_settings
    where profile_id in (
      '20000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002'
    )
  ),
  2,
  'o gatilho cria configurações para cada novo perfil'
);
select is(
  (
    select show_interests_on_profile
    from public.profile_settings
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ),
  false,
  'interesses começam ocultos por padrão'
);
select is(
  (
    select use_interests_for_suggestions
    from public.profile_settings
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ),
  false,
  'uso em sugestões exige escolha explícita'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.set_profile_interests(
      'musica',
      array[(select id from public.interests where slug = 'rock' limit 1)]::bigint[]
    )
  $$,
  'o usuário salva os próprios interesses de uma categoria'
);
select is(
  (
    select count(*)::integer
    from public.profile_interests
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ),
  1,
  'o usuário lê a própria seleção'
);
select throws_ok(
  $$select public.set_profile_interests('categoria-inexistente', '{}'::bigint[])$$,
  '22023',
  'invalid_interest_category',
  'a função recusa categorias inexistentes'
);
select throws_ok(
  $$select public.set_profile_interests('musica', array[999999999]::bigint[])$$,
  '22023',
  'invalid_interest_selection',
  'a função recusa IDs manipulados'
);
select throws_ok(
  $$
    insert into public.profile_interests (profile_id, interest_id)
    values (
      '20000000-0000-0000-0000-000000000001',
      (select id from public.interests where slug = 'pop' limit 1)
    )
  $$,
  '42501',
  null,
  'o cliente não insere interesses diretamente'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.profile_settings
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ),
  0,
  'outra pessoa não lê o progresso nem as preferências internas'
);

select is(
  (
    select count(*)::integer
    from public.profile_interests
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ),
  0,
  'outra pessoa não vê interesses privados'
);

update public.profile_settings
set show_interests_on_profile = true
where profile_id = '20000000-0000-0000-0000-000000000001';

reset role;

update public.profile_settings
set show_interests_on_profile = true
where profile_id = '20000000-0000-0000-0000-000000000001';

set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.profile_interests
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ),
  1,
  'outra pessoa vê interesses quando o dono autoriza'
);

update public.profile_settings
set hide_all_interests = true
where profile_id = '20000000-0000-0000-0000-000000000001';

reset role;

select is(
  (
    select hide_all_interests
    from public.profile_settings
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ),
  false,
  'a RLS impede alterar a privacidade de outra pessoa'
);

update public.profile_settings
set hide_all_interests = true
where profile_id = '20000000-0000-0000-0000-000000000001';

set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.profile_interests
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ),
  0,
  'ocultar tudo tem prioridade sobre a exibição no perfil'
);

reset role;

update public.profile_settings
set hide_all_interests = false
where profile_id = '20000000-0000-0000-0000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.replace_my_interests(
      array[
        (select id from public.interests where slug = 'rock' limit 1),
        (select id from public.interests where slug = 'programacao' limit 1)
      ]::bigint[]
    )
  $$,
  'o usuário substitui toda a própria seleção atomicamente'
);
select is(
  (
    select count(*)::integer
    from public.profile_interests
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ),
  2,
  'a substituição remove itens antigos e mantém os novos'
);
select throws_ok(
  $$
    update public.profiles
    set bio = repeat('a', 281)
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  null,
  'o banco recusa biografia acima de 280 caracteres'
);
select throws_ok(
  $$
    update public.profiles
    set
      favorite_spotify_url = 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC',
      favorite_spotify_title = 'Álbum inválido'
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  null,
  'o banco recusa conteúdo do Spotify que não seja uma faixa'
);
select lives_ok(
  $$
    update public.profiles
    set
      favorite_spotify_url = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      favorite_spotify_title = 'Never Gonna Give You Up'
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  'o banco aceita uma faixa oficial normalizada'
);
select lives_ok(
  $$
    update public.profiles
    set avatar_path =
      '20000000-0000-0000-0000-000000000001/avatar-30000000-0000-0000-0000-000000000001.webp'
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  'o perfil aceita avatar na própria pasta'
);
select throws_ok(
  $$
    update public.profiles
    set avatar_path =
      '20000000-0000-0000-0000-000000000002/avatar-30000000-0000-0000-0000-000000000001.webp'
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  null,
  'o perfil recusa caminho de avatar pertencente a outra conta'
);
select lives_ok(
  $$
    update public.profile_settings
    set
      onboarding_step = 8,
      onboarding_completed_at = now()
    where profile_id = '20000000-0000-0000-0000-000000000001'
  $$,
  'o usuário conclui o próprio onboarding'
);

reset role;

select ok(
  (
    select onboarding_completed_at
    from public.profile_settings
    where profile_id = '20000000-0000-0000-0000-000000000001'
  ) is not null,
  'a conclusão do onboarding fica persistida'
);

set local role authenticated;
select throws_ok(
  $$
    delete from public.profile_settings
    where profile_id = '20000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'o cliente não exclui configurações diretamente'
);
reset role;

select policies_are(
  'public',
  'profile_interests',
  array['profile_interests_read_visible'],
  'profile_interests possui somente a política de leitura controlada'
);

select * from finish();
rollback;
