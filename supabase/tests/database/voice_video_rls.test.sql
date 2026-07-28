begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

select has_function(
  'public',
  'create_server_media_channel',
  array['uuid', 'text', 'text', 'uuid', 'text', 'text'],
  'criação de canal de mídia existe'
);
select has_function(
  'public',
  'get_voice_channel_access',
  array['uuid'],
  'validação da chamada existe'
);
select has_function(
  'public',
  'ensure_text_channel_message',
  array[]::text[],
  'proteção de mensagens existe'
);
select col_type_is(
  'public',
  'server_channels',
  'channel_type',
  'text',
  'tipo do canal continua textual e controlado'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
(
  'b0000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'owner.phase11@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Owner Phase 11","handle":"ownerphase11"}'::jsonb, now(), now()
),
(
  'b0000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'member.phase11@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Member Phase 11","handle":"memberphase11"}'::jsonb, now(), now()
),
(
  'b0000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'outsider.phase11@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Outsider Phase 11","handle":"outsiderphase11"}'::jsonb, now(), now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-0000-0000-000000000011","role":"authenticated"}',
  true
);
set local role authenticated;

select set_config(
  'crypt_test.phase11_server',
  public.create_server('Servidor Phase 11', 'Voz e vídeo')::text,
  true
);
select set_config(
  'crypt_test.phase11_voice',
  public.create_server_media_channel(
    current_setting('crypt_test.phase11_server')::uuid,
    'Sala de Voz',
    'voice',
    null,
    '🔊',
    'Conversa'
  )::text,
  true
);
select set_config(
  'crypt_test.phase11_video',
  public.create_server_media_channel(
    current_setting('crypt_test.phase11_server')::uuid,
    'Sala de Vídeo',
    'video',
    null,
    '📹',
    'Câmeras'
  )::text,
  true
);

select is(
  (
    select channel_type
    from public.get_server_channels(current_setting('crypt_test.phase11_server')::uuid)
    where channel_id = current_setting('crypt_test.phase11_voice')::uuid
  ),
  'voice',
  'lista identifica canal de voz'
);
select is(
  (
    select channel_type
    from public.get_server_channels(current_setting('crypt_test.phase11_server')::uuid)
    where channel_id = current_setting('crypt_test.phase11_video')::uuid
  ),
  'video',
  'lista identifica canal de vídeo'
);
select is(
  (
    select count(*)::integer
    from public.get_voice_channel_access(current_setting('crypt_test.phase11_voice')::uuid)
  ),
  1,
  'dono recebe acesso à chamada'
);
select is(
  (
    select can_publish
    from public.get_voice_channel_access(current_setting('crypt_test.phase11_voice')::uuid)
  ),
  true,
  'dono pode publicar mídia'
);
select throws_ok(
  format(
    $$select public.create_server_media_channel(%L::uuid, 'Inválido', 'text', null, null, null)$$,
    current_setting('crypt_test.phase11_server')
  ),
  '22023',
  'invalid_media_channel_type',
  'RPC de mídia recusa tipo texto'
);
select throws_ok(
  format(
    $$select public.send_channel_message(%L::uuid, 'Texto indevido', null, '[]'::jsonb, '{}'::uuid[], '{}'::uuid[])$$,
    current_setting('crypt_test.phase11_voice')
  ),
  '42501',
  'text_channel_required',
  'canal de voz recusa mensagem de texto'
);

reset role;
insert into public.server_members (server_id, profile_id)
values (
  current_setting('crypt_test.phase11_server')::uuid,
  'b0000000-0000-0000-0000-000000000012'
);
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-0000-0000-000000000012","role":"authenticated"}',
  true
);
select is(
  (
    select count(*)::integer
    from public.get_voice_channel_access(current_setting('crypt_test.phase11_voice')::uuid)
  ),
  1,
  'membro recebe acesso'
);
select is(
  (
    select profile_id
    from public.get_voice_channel_access(current_setting('crypt_test.phase11_voice')::uuid)
  ),
  'b0000000-0000-0000-0000-000000000012'::uuid,
  'acesso usa identidade autenticada'
);
select is(
  (
    select server_id
    from public.get_voice_channel_access(current_setting('crypt_test.phase11_voice')::uuid)
  ),
  current_setting('crypt_test.phase11_server')::uuid,
  'acesso permanece no servidor correto'
);
select is(
  (
    select channel_id
    from public.get_voice_channel_access(current_setting('crypt_test.phase11_video')::uuid)
  ),
  current_setting('crypt_test.phase11_video')::uuid,
  'membro acessa canal de vídeo permitido'
);
select throws_ok(
  format(
    $$select public.create_server_media_channel(%L::uuid, 'Sem poder', 'voice', null, null, null)$$,
    current_setting('crypt_test.phase11_server')
  ),
  '42501',
  'server_channel_management_required',
  'membro não cria sala sem permissão'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-0000-0000-000000000013","role":"authenticated"}',
  true
);
select throws_ok(
  format(
    $$select * from public.get_voice_channel_access(%L::uuid)$$,
    current_setting('crypt_test.phase11_voice')
  ),
  '42501',
  'voice_channel_access_denied',
  'terceira conta não recebe acesso'
);
select throws_ok(
  format(
    $$select * from public.get_server_channels(%L::uuid)$$,
    current_setting('crypt_test.phase11_server')
  ),
  '42501',
  'server_membership_required',
  'terceira conta não lista canais'
);
select throws_ok(
  format(
    $$select public.create_server_media_channel(%L::uuid, 'Invasão', 'video', null, null, null)$$,
    current_setting('crypt_test.phase11_server')
  ),
  '42501',
  'server_channel_management_required',
  'terceira conta não cria canal'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-0000-0000-000000000011","role":"authenticated"}',
  true
);
select lives_ok(
  format(
    $$select public.delete_server_channel(%L::uuid)$$,
    current_setting('crypt_test.phase11_voice')
  ),
  'dono remove canal de voz'
);
select is(
  (
    select count(*)::integer
    from public.server_channels
    where id = current_setting('crypt_test.phase11_voice')::uuid
  ),
  0,
  'canal removido não permanece'
);
select is(
  (
    select count(*)::integer
    from public.get_server_channels(current_setting('crypt_test.phase11_server')::uuid)
    where channel_type in ('voice', 'video')
  ),
  1,
  'somente a sala de vídeo permanece'
);
select isnt(
  current_setting('crypt_test.phase11_voice'),
  current_setting('crypt_test.phase11_video'),
  'cada sala usa UUID próprio'
);
select ok(
  current_setting('crypt_test.phase11_video') ~ '^[0-9a-f-]{36}$',
  'UUID pode formar nome opaco da sala LiveKit'
);
select is(
  (
    select count(*)::integer
    from public.get_voice_channel_access(current_setting('crypt_test.phase11_video')::uuid)
  ),
  1,
  'sala restante continua acessível'
);
select is(
  (
    select channel_name
    from public.get_voice_channel_access(current_setting('crypt_test.phase11_video')::uuid)
  ),
  'Sala de Vídeo',
  'nome visível vem do banco'
);
select is(
  (
    select display_name
    from public.get_voice_channel_access(current_setting('crypt_test.phase11_video')::uuid)
  ),
  'Owner Phase 11',
  'nome do participante não vem do cliente'
);

select * from finish();
rollback;
