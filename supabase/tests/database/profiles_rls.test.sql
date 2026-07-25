begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select has_table('public', 'profiles', 'profiles existe no schema público');
select policies_are(
  'public',
  'profiles',
  array['profiles_read_public_fields', 'profiles_update_own'],
  'profiles possui somente as políticas esperadas'
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
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'kaio@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Kaio Snow","handle":"KaioSnow"}'::jsonb,
  now(),
  now()
),
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'luna@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Kaio Snow","handle":"luna_crypt"}'::jsonb,
  now(),
  now()
);

select is(
  (select count(*)::integer from public.profiles),
  2,
  'o gatilho cria um perfil para cada usuário'
);
select is(
  (select handle from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'kaiosnow',
  'o identificador é normalizado para minúsculas'
);
select is(
  (select count(*)::integer from public.profiles where display_name = 'Kaio Snow'),
  2,
  'nomes de exibição podem se repetir'
);
select is(
  public.is_handle_available('@KAIOSNOW'),
  false,
  'maiúsculas não permitem duplicar um identificador'
);
select is(
  public.is_handle_available('@admin'),
  false,
  'identificadores reservados são bloqueados'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

update public.profiles
set display_name = 'Kaio Atualizado'
where id = '10000000-0000-0000-0000-000000000001';

update public.profiles
set display_name = 'Alteração indevida'
where id = '10000000-0000-0000-0000-000000000002';

reset role;

select is(
  (select display_name from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'Kaio Atualizado',
  'o usuário altera o próprio perfil'
);
select is(
  (select display_name from public.profiles where id = '10000000-0000-0000-0000-000000000002'),
  'Kaio Snow',
  'a RLS impede alterar o perfil de outra pessoa'
);

set local role authenticated;
select throws_ok(
  $$delete from public.profiles where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'o cliente não possui permissão para excluir perfis diretamente'
);
reset role;

select * from finish();
rollback;
