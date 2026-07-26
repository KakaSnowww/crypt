begin;

create extension if not exists pgtap with schema extensions;

select plan(56);

select has_table('public', 'friend_requests', 'friend_requests existe');
select has_table('public', 'friendships', 'friendships existe');
select has_table('public', 'user_blocks', 'user_blocks existe');
select has_table(
  'public',
  'dismissed_friend_suggestions',
  'dismissed_friend_suggestions existe'
);
select has_table(
  'public',
  'connection_notifications',
  'connection_notifications existe'
);
select has_table('public', 'user_reports', 'user_reports existe');
select has_table('public', 'user_presence', 'user_presence existe');
select has_column(
  'public',
  'profile_settings',
  'discoverable_by_search',
  'a busca possui consentimento próprio'
);
select has_function(
  'public',
  'send_friend_request',
  array['uuid'],
  'send_friend_request existe'
);
select has_function(
  'public',
  'get_friend_suggestions',
  array['integer'],
  'get_friend_suggestions existe'
);
select has_function(
  'public',
  'can_start_direct_message',
  array['uuid'],
  'a barreira para DMs existe'
);
select has_function(
  'public',
  'report_profile',
  array['uuid', 'text', 'text'],
  'report_profile existe'
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
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'kaio.phase5@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Kaio Snow","handle":"kaiophase5"}'::jsonb,
  now(),
  now()
),
(
  '50000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'luna.phase5@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Luna Crypt","handle":"lunaphase5"}'::jsonb,
  now(),
  now()
),
(
  '50000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'theo.phase5@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Theo Crypt","handle":"theophase5"}'::jsonb,
  now(),
  now()
);

select is(
  (
    select count(*)::integer
    from public.user_presence
    where profile_id::text like '50000000-%'
  ),
  3,
  'o gatilho cria presença para novos perfis'
);

update public.profile_settings
set use_interests_for_suggestions = true
where profile_id in (
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000003'
);

insert into public.profile_interests (profile_id, interest_id)
select profiles.profile_id, interests.id
from (
  values
    ('50000000-0000-0000-0000-000000000001'::uuid),
    ('50000000-0000-0000-0000-000000000003'::uuid)
) as profiles(profile_id)
cross join lateral (
  select interests.id
  from public.interests
  inner join public.interest_categories
    on interest_categories.id = interests.category_id
  where interest_categories.slug = 'musica'
    and interests.slug = 'rock'
) as interests;

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    insert into public.friend_requests (sender_id, receiver_id)
    values (
      '50000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'o cliente não cria pedidos diretamente'
);
select throws_ok(
  $$select public.send_friend_request('50000000-0000-0000-0000-000000000001')$$,
  '22023',
  'cannot_request_self',
  'pedido para a própria conta é recusado'
);
select lives_ok(
  $$select public.send_friend_request('50000000-0000-0000-0000-000000000002')$$,
  'pedido válido é criado'
);
select throws_ok(
  $$select public.send_friend_request('50000000-0000-0000-0000-000000000002')$$,
  '23505',
  'friend_request_exists',
  'pedido duplicado é recusado'
);
select is(
  (select count(*)::integer from public.friend_requests),
  1,
  'o remetente lê somente o próprio pedido'
);
select is(
  (
    select count(*)::integer
    from public.search_profiles('@lunaphase5', 20)
    where handle = 'lunaphase5'
  ),
  1,
  'a busca exata pelo @ encontra o perfil'
);
select is(
  (
    select count(*)::integer
    from public.search_profiles('@luna', 20)
    where handle = 'lunaphase5'
  ),
  1,
  'a busca parcial limitada encontra o começo do @'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.friend_requests),
  0,
  'terceiros não leem pedidos de outras pessoas'
);
select is(
  (
    select count(*)::integer
    from public.profiles
    where id = '50000000-0000-0000-0000-000000000001'
  ),
  0,
  'terceiros não enumeram perfis diretamente pela tabela'
);
select throws_ok(
  $$
    select public.respond_friend_request(
      (select id from public.friend_requests limit 1),
      true
    )
  $$,
  '42501',
  'friend_request_not_received',
  'terceiros não aceitam pedidos de outras pessoas'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.get_my_connection_notifications(30)
    where notification_type = 'friend_request'
  ),
  1,
  'o destinatário recebe notificação de novo pedido'
);
select lives_ok(
  $$
    select public.respond_friend_request(
      (select id from public.friend_requests where receiver_id = auth.uid()),
      true
    )
  $$,
  'o destinatário aceita o pedido'
);
select is(
  (select count(*)::integer from public.friend_requests),
  0,
  'o pedido aceito deixa de ficar pendente'
);
select is(
  (select count(*)::integer from public.get_my_friends()),
  1,
  'a amizade aparece uma única vez para o participante'
);
select lives_ok(
  $$select public.set_my_presence('online')$$,
  'a pessoa atualiza a própria presença'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.get_my_connection_notifications(30)
    where notification_type = 'friend_accepted'
  ),
  1,
  'o remetente recebe notificação de pedido aceito'
);
select is(
  (
    select count(*)::integer
    from public.get_my_friends()
    where profile_id = '50000000-0000-0000-0000-000000000002'
      and is_online
  ),
  1,
  'um amigo com presença autorizada aparece online'
);
select throws_ok(
  $$select public.send_friend_request('50000000-0000-0000-0000-000000000002')$$,
  '23505',
  'already_friends',
  'amizade duplicada é recusada'
);
select is(
  (
    select count(*)::integer
    from public.get_friend_suggestions(20)
    where profile_id = '50000000-0000-0000-0000-000000000003'
  ),
  1,
  'uma pessoa com interesse em comum aparece nas sugestões'
);
select ok(
  (
    select shared_interest_labels @> array['Rock']::text[]
    from public.get_friend_suggestions(20)
    where profile_id = '50000000-0000-0000-0000-000000000003'
  ),
  'a sugestão explica o interesse em comum'
);
select lives_ok(
  $$
    select public.dismiss_friend_suggestion(
      '50000000-0000-0000-0000-000000000003',
      false
    )
  $$,
  'o usuário ignora uma sugestão'
);
select is(
  (
    select count(*)::integer
    from public.get_friend_suggestions(20)
    where profile_id = '50000000-0000-0000-0000-000000000003'
  ),
  0,
  'uma sugestão ignorada fica oculta'
);
select lives_ok(
  $$
    select public.report_profile(
      '50000000-0000-0000-0000-000000000003',
      'spam',
      'Comportamento repetitivo para teste.'
    )
  $$,
  'o usuário envia uma denúncia privada'
);
select throws_ok(
  $$
    select public.report_profile(
      '50000000-0000-0000-0000-000000000003',
      'spam',
      null
    )
  $$,
  '23505',
  'report_already_sent',
  'uma denúncia repetida em 24 horas é recusada'
);
select throws_ok(
  $$
    insert into public.user_reports (
      reporter_id,
      reported_profile_id,
      reason
    )
    values (
      '50000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000002',
      'other'
    )
  $$,
  '42501',
  null,
  'o cliente não cria denúncias diretamente'
);

reset role;

delete from public.dismissed_friend_suggestions
where profile_id = '50000000-0000-0000-0000-000000000001'
  and suggested_profile_id = '50000000-0000-0000-0000-000000000003';

set local role authenticated;

select lives_ok(
  $$select public.block_profile('50000000-0000-0000-0000-000000000003')$$,
  'o usuário bloqueia outra pessoa'
);
select is(
  (
    select count(*)::integer
    from public.get_friend_suggestions(20)
    where profile_id = '50000000-0000-0000-0000-000000000003'
  ),
  0,
  'uma pessoa bloqueada não aparece nas sugestões'
);
select is(
  (
    select count(*)::integer
    from public.get_blocked_profiles()
    where profile_id = '50000000-0000-0000-0000-000000000003'
  ),
  1,
  'o bloqueio aparece somente na lista do autor'
);
select is(
  public.can_start_direct_message(
    '50000000-0000-0000-0000-000000000003'
  ),
  false,
  'um bloqueio impede iniciar uma futura DM'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.user_blocks),
  0,
  'a pessoa bloqueada não lê quem a bloqueou'
);
select is(
  (select count(*)::integer from public.user_reports),
  0,
  'a pessoa denunciada não lê a denúncia'
);
select is(
  (select count(*)::integer from public.friendships),
  0,
  'terceiros não leem amizades de outras pessoas'
);
select throws_ok(
  $$select public.send_friend_request('50000000-0000-0000-0000-000000000001')$$,
  '42501',
  'connection_blocked',
  'a pessoa bloqueada não envia novo pedido'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.unblock_profile('50000000-0000-0000-0000-000000000003')$$,
  'o autor remove o bloqueio'
);
select lives_ok(
  $$select public.remove_friend('50000000-0000-0000-0000-000000000002')$$,
  'um participante remove a amizade'
);
select is(
  (select count(*)::integer from public.get_my_friends()),
  0,
  'a amizade removida desaparece da lista'
);

reset role;

update public.profile_settings
set allow_friend_requests = false
where profile_id = '50000000-0000-0000-0000-000000000003';

set local role authenticated;

select throws_ok(
  $$select public.send_friend_request('50000000-0000-0000-0000-000000000003')$$,
  '42501',
  'friend_requests_disabled',
  'a privacidade impede novos pedidos'
);

reset role;

update public.profile_settings
set discoverable_by_search = false
where profile_id = '50000000-0000-0000-0000-000000000003';

set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.search_profiles('@theo', 20)
    where profile_id = '50000000-0000-0000-0000-000000000003'
  ),
  0,
  'um perfil não encontrável fica fora da busca'
);
select is(
  (
    select count(*)::integer
    from public.get_public_profile_by_handle('@theophase5')
  ),
  0,
  'um perfil não encontrável também não abre por consulta direta'
);
select lives_ok(
  $$select public.mark_connection_notifications_read()$$,
  'o usuário marca somente as próprias notificações como lidas'
);
select is(
  (
    select count(*)::integer
    from public.get_my_connection_notifications(30)
    where read_at is null
  ),
  0,
  'as notificações do usuário ficam marcadas como lidas'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.friendships),
  0,
  'terceiros não leem amizades removidas nem pares alheios'
);
select throws_ok(
  $$
    insert into public.user_blocks (blocker_id, blocked_id)
    values (
      '50000000-0000-0000-0000-000000000003',
      '50000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'o cliente não cria bloqueios diretamente'
);

reset role;

select * from finish();

rollback;
