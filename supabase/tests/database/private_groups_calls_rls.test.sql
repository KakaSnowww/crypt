begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

select has_column('public', 'direct_conversations', 'title', 'grupos têm nome');
select has_column('public', 'direct_conversations', 'avatar_path', 'grupos têm imagem privada');
select has_column(
  'public',
  'direct_conversation_participants',
  'participant_role',
  'participantes têm função no grupo'
);
select has_function('public', 'create_direct_group', array['text', 'uuid[]'], 'criação protegida existe');
select has_function('public', 'get_direct_group_members', array['uuid'], 'lista de membros existe');
select has_function('public', 'update_direct_group', array['uuid', 'text', 'text'], 'edição existe');
select has_function('public', 'add_direct_group_member', array['uuid', 'uuid'], 'adição existe');
select has_function('public', 'remove_direct_group_member', array['uuid', 'uuid'], 'remoção existe');
select has_function(
  'public',
  'transfer_direct_group_ownership',
  array['uuid', 'uuid'],
  'transferência existe'
);
select has_function('public', 'leave_direct_group', array['uuid'], 'saída existe');
select has_function('public', 'delete_direct_group', array['uuid'], 'exclusão existe');
select has_function('public', 'get_direct_voice_access', array['uuid'], 'autorização de chamada existe');
select is(
  (select count(*)::integer from storage.buckets where id = 'direct-group-media' and not public),
  1,
  'imagem do grupo fica em bucket privado'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
(
  '18000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase18-owner@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Phase 18 Owner","handle":"phase18owner"}'::jsonb, now(), now()
),
(
  '18000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase18-b@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Phase 18 B","handle":"phase18memberb"}'::jsonb, now(), now()
),
(
  '18000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase18-c@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Phase 18 C","handle":"phase18memberc"}'::jsonb, now(), now()
),
(
  '18000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase18-outsider@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Phase 18 Fora","handle":"phase18fora"}'::jsonb, now(), now()
);

insert into public.friendships (user_low_id, user_high_id)
values
('18000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000002'),
('18000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000003');

select set_config(
  'request.jwt.claims',
  '{"sub":"18000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select set_config(
      'crypt_test.phase18_group',
      public.create_direct_group(
        'Equipe privada',
        array[
          '18000000-0000-0000-0000-000000000002'::uuid,
          '18000000-0000-0000-0000-000000000003'::uuid
        ]
      )::text,
      true
    )
  $$,
  'proprietário cria grupo com dois amigos'
);
select is(
  (select count(*)::integer from public.get_direct_group_members(current_setting('crypt_test.phase18_group')::uuid)),
  3,
  'grupo começa com três participantes'
);
select is(
  (select is_owner from public.get_my_direct_conversations() where conversation_id = current_setting('crypt_test.phase18_group')::uuid),
  true,
  'criador é administrador'
);
select is(
  public.can_manage_direct_group_media(
    current_setting('crypt_test.phase18_group') || '/18000000-0000-0000-0000-000000000001/' || gen_random_uuid() || '.png'
  ),
  true,
  'administrador pode enviar imagem do grupo'
);
select is(
  public.can_view_direct_group_media(
    current_setting('crypt_test.phase18_group') || '/18000000-0000-0000-0000-000000000001/' || gen_random_uuid() || '.png'
  ),
  true,
  'participante pode ver imagem do grupo'
);
select lives_ok(
  $$ select * from public.get_direct_voice_access(current_setting('crypt_test.phase18_group')::uuid) $$,
  'proprietário pode entrar na chamada'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"18000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.get_direct_group_members(current_setting('crypt_test.phase18_group')::uuid)),
  3,
  'membro consulta os participantes'
);
select lives_ok(
  $$ select * from public.get_direct_voice_access(current_setting('crypt_test.phase18_group')::uuid) $$,
  'membro pode entrar na chamada'
);
select throws_ok(
  $$ select public.update_direct_group(current_setting('crypt_test.phase18_group')::uuid, 'Nome indevido', null) $$,
  '42501',
  'direct_group_owner_required',
  'membro não administra o grupo'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"18000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.get_direct_group_members(current_setting('crypt_test.phase18_group')::uuid) $$,
  '42501',
  'direct_group_access_required',
  'terceira pessoa não consulta o grupo'
);
select throws_ok(
  $$ select * from public.get_direct_voice_access(current_setting('crypt_test.phase18_group')::uuid) $$,
  '42501',
  'direct_voice_access_denied',
  'terceira pessoa não entra na chamada'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"18000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select public.add_direct_group_member(current_setting('crypt_test.phase18_group')::uuid, '18000000-0000-0000-0000-000000000004') $$,
  '42501',
  'group_member_not_allowed',
  'administrador não adiciona quem não é amigo'
);
select lives_ok(
  $$ select public.transfer_direct_group_ownership(current_setting('crypt_test.phase18_group')::uuid, '18000000-0000-0000-0000-000000000002') $$,
  'administração é transferida'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"18000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.is_direct_group_owner(current_setting('crypt_test.phase18_group')::uuid),
  true,
  'novo administrador assume o grupo'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"18000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.leave_direct_group(current_setting('crypt_test.phase18_group')::uuid) $$,
  'antigo administrador pode sair depois da transferência'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"18000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.get_direct_group_members(current_setting('crypt_test.phase18_group')::uuid)),
  2,
  'saída remove somente o participante'
);
select is(
  (
    select count(*)::integer
    from public.direct_conversation_participants
    where conversation_id = current_setting('crypt_test.phase18_group')::uuid
      and participant_role = 'owner'
  ),
  1,
  'grupo preserva exatamente um administrador'
);

select * from finish();
rollback;
