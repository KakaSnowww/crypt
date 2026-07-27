begin;

create extension if not exists pgtap with schema extensions;

select plan(44);

select has_table('public', 'direct_conversations', 'direct_conversations existe');
select has_table(
  'public',
  'direct_conversation_participants',
  'direct_conversation_participants existe'
);
select has_table('public', 'direct_messages', 'direct_messages existe');
select has_table(
  'public',
  'direct_message_reactions',
  'direct_message_reactions existe'
);
select has_table(
  'public',
  'direct_message_attachments',
  'direct_message_attachments existe'
);
select has_function(
  'public',
  'open_direct_conversation',
  array['uuid'],
  'open_direct_conversation existe'
);
select has_function(
  'public',
  'get_my_direct_conversations',
  array[]::text[],
  'get_my_direct_conversations existe'
);
select has_function(
  'public',
  'get_direct_messages',
  array['uuid', 'timestamp with time zone', 'uuid', 'integer'],
  'get_direct_messages existe'
);
select has_function(
  'public',
  'send_direct_message',
  array['uuid', 'text', 'uuid', 'jsonb'],
  'send_direct_message existe'
);
select has_function(
  'public',
  'edit_direct_message',
  array['uuid', 'text'],
  'edit_direct_message existe'
);
select has_function(
  'public',
  'delete_direct_message',
  array['uuid'],
  'delete_direct_message existe'
);
select has_function(
  'public',
  'toggle_direct_message_reaction',
  array['uuid', 'text'],
  'toggle_direct_message_reaction existe'
);
select has_function(
  'public',
  'mark_direct_conversation_read',
  array['uuid'],
  'mark_direct_conversation_read existe'
);
select has_function(
  'public',
  'hide_direct_conversation',
  array['uuid'],
  'hide_direct_conversation existe'
);
select has_function(
  'public',
  'can_upload_direct_attachment',
  array['text'],
  'can_upload_direct_attachment existe'
);
select is(
  (
    select count(*)::integer
    from storage.buckets
    where id = 'direct-message-attachments'
      and not public
  ),
  1,
  'o bucket de DMs é privado'
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
  '90000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'phase9-a@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Pessoa Phase A","handle":"phasepessoa"}'::jsonb,
  now(),
  now()
),
(
  '90000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'phase9-b@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Pessoa Phase B","handle":"phasepessoab"}'::jsonb,
  now(),
  now()
),
(
  '90000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'phase9-c@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Pessoa Phase C","handle":"phasepessoac"}'::jsonb,
  now(),
  now()
);

insert into public.friendships (user_low_id, user_high_id)
values (
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.can_start_direct_message('90000000-0000-0000-0000-000000000002'),
  true,
  'amigos podem iniciar uma DM com a política padrão'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.phase9_conversation',
      public.open_direct_conversation(
        '90000000-0000-0000-0000-000000000002'
      )::text,
      true
    )
  $$,
  'a pessoa A abre conversa com B'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.phase9_message_a',
      public.send_direct_message(
        current_setting('crypt_test.phase9_conversation')::uuid,
        'Olá, pessoa B.',
        null,
        '[]'::jsonb
      )::text,
      true
    )
  $$,
  'a pessoa A envia mensagem'
);
select is(
  (
    select count(*)::integer
    from public.get_direct_messages(
      current_setting('crypt_test.phase9_conversation')::uuid,
      null,
      null,
      50
    )
  ),
  1,
  'a pessoa A consulta o histórico'
);
select is(
  public.can_upload_direct_attachment(
    current_setting('crypt_test.phase9_conversation')
      || '/90000000-0000-0000-0000-000000000001/'
      || gen_random_uuid()::text
      || '.png'
  ),
  true,
  'um caminho de anexo privado válido é aceito'
);
select is(
  public.can_upload_direct_attachment('fora/do/padrao.exe'),
  false,
  'um caminho de anexo inseguro é recusado'
);
select throws_ok(
  $$
    insert into public.direct_messages (
      conversation_id,
      author_id,
      content
    )
    values (
      current_setting('crypt_test.phase9_conversation')::uuid,
      auth.uid(),
      'inserção direta'
    )
  $$,
  '42501',
  null,
  'o cliente não insere mensagem diretamente'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select *
    from public.get_direct_messages(
      current_setting('crypt_test.phase9_conversation')::uuid,
      null,
      null,
      50
    )
  $$,
  '42501',
  'direct_access_required',
  'a terceira pessoa não lê a DM entre A e B'
);
select is(
  (select count(*)::integer from public.get_my_direct_conversations()),
  0,
  'a conversa alheia não aparece na lista da pessoa C'
);
select is(
  public.can_start_direct_message('90000000-0000-0000-0000-000000000002'),
  false,
  'uma pessoa que não é amiga respeita a política de B'
);
select throws_ok(
  $$
    select public.open_direct_conversation(
      '90000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  'direct_message_not_allowed',
  'a pessoa C não inicia uma nova conversa proibida'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select unread_count::integer
    from public.get_my_direct_conversations()
    where conversation_id = current_setting('crypt_test.phase9_conversation')::uuid
  ),
  1,
  'a pessoa B recebe uma mensagem não lida'
);
select lives_ok(
  $$
    select public.mark_direct_conversation_read(
      current_setting('crypt_test.phase9_conversation')::uuid
    )
  $$,
  'a pessoa B marca a conversa como lida'
);
select is(
  (
    select unread_count::integer
    from public.get_my_direct_conversations()
    where conversation_id = current_setting('crypt_test.phase9_conversation')::uuid
  ),
  0,
  'o contador não lido é limpo'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.phase9_message_b',
      public.send_direct_message(
        current_setting('crypt_test.phase9_conversation')::uuid,
        'Olá, pessoa A.',
        current_setting('crypt_test.phase9_message_a')::uuid,
        '[]'::jsonb
      )::text,
      true
    )
  $$,
  'a pessoa B responde à mensagem'
);
select lives_ok(
  $$
    select public.edit_direct_message(
      current_setting('crypt_test.phase9_message_b')::uuid,
      'Olá, pessoa A! Mensagem editada.'
    )
  $$,
  'a pessoa B edita a própria mensagem'
);
select is(
  public.toggle_direct_message_reaction(
    current_setting('crypt_test.phase9_message_a')::uuid,
    '💜'
  ),
  true,
  'a pessoa B reage à mensagem'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.get_direct_messages(
      current_setting('crypt_test.phase9_conversation')::uuid,
      null,
      null,
      50
    )
  ),
  2,
  'a pessoa A recebe a resposta em seu histórico'
);
select is(
  public.delete_direct_message(
    current_setting('crypt_test.phase9_message_a')::uuid
  ),
  '{}'::text[],
  'a exclusão retorna os anexos para limpeza'
);
select is(
  (
    select count(*)::integer
    from public.get_direct_messages(
      current_setting('crypt_test.phase9_conversation')::uuid,
      null,
      null,
      50
    )
    where message_id = current_setting('crypt_test.phase9_message_a')::uuid
      and deleted_at is not null
      and content is null
  ),
  1,
  'a mensagem direta é excluída logicamente'
);
select lives_ok(
  $$
    select public.hide_direct_conversation(
      current_setting('crypt_test.phase9_conversation')::uuid
    )
  $$,
  'a pessoa A fecha a conversa sem apagar o histórico'
);
select is(
  (select count(*)::integer from public.get_my_direct_conversations()),
  0,
  'a conversa fechada desaparece apenas da lista de A'
);
select lives_ok(
  $$
    select public.open_direct_conversation(
      '90000000-0000-0000-0000-000000000002'
    )
  $$,
  'abrir novamente recupera a conversa existente'
);
select is(
  (select count(*)::integer from public.get_my_direct_conversations()),
  1,
  'o histórico volta à lista sem duplicar a conversa'
);
select lives_ok(
  $$
    select public.block_profile(
      '90000000-0000-0000-0000-000000000002'
    )
  $$,
  'a pessoa A bloqueia B'
);
select throws_ok(
  $$
    select public.send_direct_message(
      current_setting('crypt_test.phase9_conversation')::uuid,
      'tentativa bloqueada',
      null,
      '[]'::jsonb
    )
  $$,
  '42501',
  'direct_message_blocked',
  'um bloqueio impede novas mensagens'
);
select throws_ok(
  $$
    select public.toggle_direct_message_reaction(
      current_setting('crypt_test.phase9_message_b')::uuid,
      '🔥'
    )
  $$,
  '42501',
  'direct_message_blocked',
  'um bloqueio também impede novas reações'
);
select is(
  (
    select count(*)::integer
    from public.direct_conversations
    where id = current_setting('crypt_test.phase9_conversation')::uuid
  ),
  1,
  'bloquear preserva o histórico existente'
);

reset role;

select * from finish();
rollback;
