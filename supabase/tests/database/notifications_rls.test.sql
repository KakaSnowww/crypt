begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select has_table('public', 'user_notifications', 'central de notificações existe');
select has_table('public', 'notification_preferences', 'preferências existem');
select has_function(
  'public',
  'get_my_notifications',
  array['integer', 'timestamp with time zone', 'boolean'],
  'consulta privada existe'
);
select has_function(
  'public',
  'get_my_notification_preferences',
  array[]::text[],
  'consulta de preferências existe'
);
select has_function(
  'public',
  'save_my_notification_preferences',
  array['boolean', 'boolean', 'boolean', 'boolean', 'boolean', 'boolean', 'boolean'],
  'salvamento de preferências existe'
);
select has_function(
  'public',
  'mark_notification_read',
  array['uuid'],
  'leitura individual existe'
);
select has_function(
  'public',
  'mark_all_notifications_read',
  array[]::text[],
  'leitura em lote existe'
);
select col_type_is(
  'public',
  'user_notifications',
  'notification_type',
  'text',
  'tipo da notificação é controlado'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
(
  'c0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'recipient.phase12@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Recipient Phase 12","handle":"recipientphase12"}'::jsonb, now(), now()
),
(
  'c0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'actor.phase12@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Actor Phase 12","handle":"actorphase12"}'::jsonb, now(), now()
);

select is(
  (
    select count(*)::integer
    from public.notification_preferences
    where profile_id = 'c0000000-0000-0000-0000-000000000001'
  ),
  1,
  'preferências são criadas para a primeira conta'
);
select is(
  (
    select count(*)::integer
    from public.notification_preferences
    where profile_id = 'c0000000-0000-0000-0000-000000000002'
  ),
  1,
  'preferências são criadas para a segunda conta'
);

insert into public.user_notifications (
  id, recipient_id, actor_id, notification_type, title, body, target_path
)
values (
  'c1000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002',
  'direct_message',
  'Nova mensagem',
  'Mensagem privada de teste.',
  '/app/mensagens/c2000000-0000-0000-0000-000000000001'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.get_my_notifications(30, null, false)),
  1,
  'destinatário consulta sua notificação'
);
select is(
  (select title from public.get_my_notifications(30, null, false) limit 1),
  'Nova mensagem',
  'consulta retorna conteúdo esperado'
);
select is(
  (select count(*)::integer from public.get_my_notifications(30, null, true)),
  1,
  'filtro de não lidas funciona'
);
select is(
  (select count(*)::integer from public.user_notifications),
  1,
  'RLS permite somente a própria linha'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.get_my_notifications(30, null, false)),
  0,
  'outra conta não recebe a notificação'
);
select is(
  (select count(*)::integer from public.user_notifications),
  0,
  'RLS esconde a linha de outra conta'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.mark_notification_read(
    'c1000000-0000-0000-0000-000000000001'
  )$$,
  'destinatário marca como lida'
);
select is(
  (select count(*)::integer from public.get_my_notifications(30, null, true)),
  0,
  'notificação lida sai do filtro'
);
select lives_ok(
  $$select public.save_my_notification_preferences(
    true, true, false, true, true, true, false
  )$$,
  'pessoa salva preferências'
);
select is(
  (
    select system_enabled
    from public.get_my_notification_preferences()
  ),
  true,
  'alerta do sistema foi habilitado'
);
select is(
  (
    select friend_activity_enabled
    from public.get_my_notification_preferences()
  ),
  false,
  'categoria de amizade foi desabilitada'
);
select throws_ok(
  $$insert into public.user_notifications (
    recipient_id, notification_type, title, body
  ) values (
    'c0000000-0000-0000-0000-000000000001',
    'direct_message',
    'Forjada',
    'Cliente não pode inserir.'
  )$$,
  '42501',
  null,
  'cliente não forja notificação'
);
select throws_ok(
  $$update public.user_notifications
    set title = 'Alterada pelo cliente'
    where id = 'c1000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'cliente não altera conteúdo diretamente'
);
select throws_ok(
  $$select public.mark_notification_read(
    'c1000000-0000-0000-0000-000000000099'
  )$$,
  'P0002',
  'notification_not_found',
  'id inexistente não altera outras linhas'
);

select * from finish();
rollback;
