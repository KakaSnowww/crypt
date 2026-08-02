begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

select has_table('public', 'push_devices', 'registro privado de dispositivos existe');
select has_table('public', 'push_deliveries', 'auditoria de entregas existe');
select has_function(
  'public',
  'register_my_push_device',
  array['uuid', 'text', 'text'],
  'registro autenticado existe'
);
select has_function(
  'public',
  'unregister_my_push_device',
  array['uuid'],
  'remoção autenticada existe'
);
select col_is_pk('public', 'push_devices', 'id', 'dispositivo possui chave primária');
select col_is_fk('public', 'push_devices', 'profile_id', 'dispositivo pertence ao perfil');
select col_is_unique(
  'public',
  'push_devices',
  array['profile_id', 'device_id'],
  'uma instalação aparece uma vez por perfil'
);
select col_is_unique('public', 'push_devices', 'push_token', 'token FCM não é duplicado');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
(
  'e0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'push.one@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Push One","handle":"pushone"}'::jsonb, now(), now()
),
(
  'e0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'push.two@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Push Two","handle":"pushtwo"}'::jsonb, now(), now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.register_my_push_device(
    'e1000000-0000-4000-8000-000000000001',
    'token-fcm-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '0.2.7'
  )$$,
  'primeira conta registra o próprio celular'
);
select throws_ok(
  $$select * from public.push_devices$$,
  '42501',
  null,
  'cliente não lê tokens diretamente'
);
select throws_ok(
  $$insert into public.push_devices (
    profile_id, device_id, push_token
  ) values (
    'e0000000-0000-0000-0000-000000000001',
    'e1000000-0000-4000-8000-000000000099',
    'token-fcm-forjado-aaaaaaaaaaaaaaaaaaaa'
  )$$,
  '42501',
  null,
  'cliente não grava tokens diretamente'
);
select throws_ok(
  $$select public.register_my_push_device(
    'e1000000-0000-4000-8000-000000000001',
    'curto',
    '0.2.7'
  )$$,
  '22023',
  'invalid_push_token',
  'token curto é recusado'
);
select lives_ok(
  $$select public.register_my_push_device(
    'e1000000-0000-4000-8000-000000000001',
    'token-fcm-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '0.2.8'
  )$$,
  'mesma instalação atualiza o token'
);

reset role;

select is(
  (select count(*)::integer from public.push_devices),
  1,
  'atualização não duplica o dispositivo'
);
select is(
  (select push_token from public.push_devices limit 1),
  'token-fcm-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'token mais recente foi persistido'
);
select is(
  (select app_version from public.push_devices limit 1),
  '0.2.8',
  'versão do aplicativo foi atualizada'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.register_my_push_device(
    'e1000000-0000-4000-8000-000000000002',
    'token-fcm-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '0.2.8'
  )$$,
  'login em outra conta transfere o token com segurança'
);

reset role;

select is(
  (select profile_id from public.push_devices limit 1),
  'e0000000-0000-0000-0000-000000000002'::uuid,
  'token pertence somente à conta atual'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.unregister_my_push_device(
    'e1000000-0000-4000-8000-000000000002'
  )$$,
  'outra conta não recebe informação ao tentar remover um aparelho'
);

reset role;

select is(
  (select count(*)::integer from public.push_devices),
  1,
  'uma conta não remove o dispositivo da outra'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.unregister_my_push_device(
    'e1000000-0000-4000-8000-000000000002'
  )$$,
  'proprietário remove o próprio dispositivo ao sair'
);

reset role;

select is(
  (select count(*)::integer from public.push_devices),
  0,
  'logout elimina o destino de push'
);
select is(
  (select count(*)::integer from public.push_deliveries),
  0,
  'nenhuma entrega é criada pelo cliente'
);

select * from finish();
rollback;
