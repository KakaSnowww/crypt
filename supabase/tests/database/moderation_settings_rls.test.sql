begin;

create extension if not exists pgtap with schema extensions;

select plan(42);

select has_table('public', 'server_moderation_settings', 'preferências existem');
select has_table('public', 'server_audit_logs', 'auditoria existe');
select has_table('public', 'server_reports', 'denúncias internas existem');
select has_function('public', 'can_moderate_server_member', array['uuid', 'uuid'], 'hierarquia existe');
select has_function('public', 'get_server_moderation_settings', array['uuid'], 'consulta preferências existe');
select has_function('public', 'update_server_moderation_settings', array['uuid', 'boolean', 'boolean', 'boolean'], 'atualização existe');
select has_function('public', 'kick_server_member', array['uuid', 'uuid', 'text'], 'expulsão existe');
select has_function('public', 'ban_server_member', array['uuid', 'uuid', 'text'], 'banimento existe');
select has_function('public', 'unban_server_member', array['uuid', 'uuid', 'text'], 'remoção de ban existe');
select has_function('public', 'report_server_member', array['uuid', 'uuid', 'text', 'text'], 'denúncia existe');
select has_function('public', 'resolve_server_report', array['uuid', 'text', 'text'], 'resolução existe');
select has_function('public', 'get_server_bans', array['uuid'], 'lista de bans existe');
select has_function('public', 'get_server_reports', array['uuid', 'text'], 'caixa de denúncias existe');
select has_function('public', 'get_server_audit_logs', array['uuid', 'integer'], 'consulta auditoria existe');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
(
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'owner.phase10@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Owner Phase 10","handle":"ownerphase10"}'::jsonb, now(), now()
),
(
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'mod.phase10@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Mod Phase 10","handle":"modphase10"}'::jsonb, now(), now()
),
(
  'a0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'member.phase10@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Member Phase 10","handle":"memberphase10"}'::jsonb, now(), now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select set_config(
  'crypt_test.phase10_server',
  public.create_server('Servidor Phase 10', 'Moderação segura')::text,
  true
);

select is(
  (
    select count(*)::integer
    from public.get_server_moderation_settings(
      current_setting('crypt_test.phase10_server')::uuid
    )
  ),
  1,
  'preferências são criadas automaticamente'
);
select ok(
  public.can_moderate_server_member(
    current_setting('crypt_test.phase10_server')::uuid,
    'a0000000-0000-0000-0000-000000000002'
  ) = false,
  'alvo precisa ser membro'
);

reset role;
insert into public.server_members (server_id, profile_id)
values
(
  current_setting('crypt_test.phase10_server')::uuid,
  'a0000000-0000-0000-0000-000000000002'
),
(
  current_setting('crypt_test.phase10_server')::uuid,
  'a0000000-0000-0000-0000-000000000003'
);
insert into public.server_roles (
  id, server_id, name, color, position, permissions, is_default, is_system
)
values (
  'a1000000-0000-0000-0000-000000000001',
  current_setting('crypt_test.phase10_server')::uuid,
  'Moderador', '#8B5CF6', 10, 64, false, false
);
insert into public.server_member_roles (server_id, profile_id, role_id)
values (
  current_setting('crypt_test.phase10_server')::uuid,
  'a0000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select ok(
  public.can_moderate_server_member(
    current_setting('crypt_test.phase10_server')::uuid,
    'a0000000-0000-0000-0000-000000000002'
  ),
  'dono pode moderar membro'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select ok(
  not public.can_moderate_server_member(
    current_setting('crypt_test.phase10_server')::uuid,
    'a0000000-0000-0000-0000-000000000001'
  ),
  'moderador nunca modera o dono'
);
select ok(
  public.can_moderate_server_member(
    current_setting('crypt_test.phase10_server')::uuid,
    'a0000000-0000-0000-0000-000000000003'
  ),
  'moderador age sobre cargo inferior'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select ok(
  not public.can_moderate_server_member(
    current_setting('crypt_test.phase10_server')::uuid,
    'a0000000-0000-0000-0000-000000000002'
  ),
  'membro não modera cargo superior'
);
select lives_ok(
  format(
    $$select public.report_server_member(%L::uuid, %L::uuid, 'spam', 'Teste controlado')$$,
    current_setting('crypt_test.phase10_server'),
    'a0000000-0000-0000-0000-000000000002'
  ),
  'membro envia denúncia'
);
select throws_ok(
  format(
    $$select * from public.get_server_audit_logs(%L::uuid, 100)$$,
    current_setting('crypt_test.phase10_server')
  ),
  '42501',
  null,
  'membro comum não lê auditoria'
);
select throws_ok(
  'select * from public.server_reports',
  '42501',
  null,
  'cliente não lê tabela de denúncias diretamente'
);
select throws_ok(
  $$insert into public.server_audit_logs (server_id, action)
    values ('00000000-0000-0000-0000-000000000000', 'member_kicked')$$,
  '42501',
  null,
  'cliente não forja auditoria'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select is(
  (
    select count(*)::integer
    from public.get_server_reports(
      current_setting('crypt_test.phase10_server')::uuid,
      'open'
    )
  ),
  1,
  'moderador recebe denúncia'
);
select lives_ok(
  format(
    $$select public.resolve_server_report(
      (select report_id from public.get_server_reports(%L::uuid, 'open') limit 1),
      'resolved',
      'Analisada'
    )$$,
    current_setting('crypt_test.phase10_server')
  ),
  'moderador resolve denúncia'
);
select is(
  (
    select count(*)::integer
    from public.get_server_reports(
      current_setting('crypt_test.phase10_server')::uuid,
      'open'
    )
  ),
  0,
  'denúncia sai da fila aberta'
);
select lives_ok(
  format(
    $$select public.ban_server_member(%L::uuid, %L::uuid, 'Quebra das regras')$$,
    current_setting('crypt_test.phase10_server'),
    'a0000000-0000-0000-0000-000000000003'
  ),
  'moderador bane cargo inferior'
);
select is(
  (
    select count(*)::integer
    from public.get_server_bans(current_setting('crypt_test.phase10_server')::uuid)
  ),
  1,
  'banimento aparece na lista'
);
select is(
  (
    select count(*)::integer
    from public.server_members
    where server_id = current_setting('crypt_test.phase10_server')::uuid
      and profile_id = 'a0000000-0000-0000-0000-000000000003'
  ),
  0,
  'banimento remove associação do membro'
);
select lives_ok(
  format(
    $$select public.unban_server_member(%L::uuid, %L::uuid, null)$$,
    current_setting('crypt_test.phase10_server'),
    'a0000000-0000-0000-0000-000000000003'
  ),
  'moderador remove banimento'
);
select is(
  (
    select count(*)::integer
    from public.get_server_bans(current_setting('crypt_test.phase10_server')::uuid)
  ),
  0,
  'lista reflete remoção do ban'
);
select ok(
  (
    select count(*)
    from public.get_server_audit_logs(
      current_setting('crypt_test.phase10_server')::uuid,
      100
    )
  ) >= 3,
  'auditoria registra resolução, ban e desbanimento'
);
select throws_ok(
  format(
    $$select public.kick_server_member(%L::uuid, %L::uuid, null)$$,
    current_setting('crypt_test.phase10_server'),
    'a0000000-0000-0000-0000-000000000001'
  ),
  '42501',
  'cannot_moderate_member',
  'moderador não expulsa o dono'
);
select throws_ok(
  format(
    $$select public.update_server_moderation_settings(%L::uuid, false, false, false)$$,
    current_setting('crypt_test.phase10_server')
  ),
  '42501',
  'server_owner_required',
  'moderador não altera preferências do dono'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  format(
    $$select public.update_server_moderation_settings(%L::uuid, false, false, false)$$,
    current_setting('crypt_test.phase10_server')
  ),
  'dono atualiza preferências'
);
select is(
  (
    select allow_member_reports
    from public.get_server_moderation_settings(
      current_setting('crypt_test.phase10_server')::uuid
    )
  ),
  false,
  'preferência foi persistida'
);
select is(
  (
    select require_ban_reason
    from public.get_server_moderation_settings(
      current_setting('crypt_test.phase10_server')::uuid
    )
  ),
  false,
  'exigência de motivo foi persistida'
);
select is(
  (
    select notify_moderators_on_report
    from public.get_server_moderation_settings(
      current_setting('crypt_test.phase10_server')::uuid
    )
  ),
  false,
  'preferência de notificação foi persistida'
);
select throws_ok(
  'delete from public.server_audit_logs',
  '42501',
  null,
  'cliente não apaga auditoria'
);
select throws_ok(
  'update public.server_moderation_settings set allow_member_reports = true',
  '42501',
  null,
  'cliente não contorna RPC de preferências'
);
select is(
  (
    select count(*)::integer
    from public.get_server_reports(
      current_setting('crypt_test.phase10_server')::uuid,
      'resolved'
    )
  ),
  1,
  'histórico mantém denúncia resolvida'
);

select * from finish();
rollback;
