begin;

create extension if not exists pgtap with schema extensions;

select plan(62);

select has_table('public', 'server_categories', 'server_categories existe');
select has_table('public', 'server_member_roles', 'server_member_roles existe');
select has_table(
  'public',
  'server_permission_overrides',
  'server_permission_overrides existe'
);
select has_table('public', 'channel_messages', 'channel_messages existe');
select has_table('public', 'message_reactions', 'message_reactions existe');
select has_table('public', 'message_attachments', 'message_attachments existe');
select has_table('public', 'channel_read_states', 'channel_read_states existe');
select has_function(
  'public',
  'get_server_categories',
  array['uuid'],
  'get_server_categories existe'
);
select has_function(
  'public',
  'get_server_channels',
  array['uuid'],
  'get_server_channels existe'
);
select has_function('public', 'get_server_roles', array['uuid'], 'get_server_roles existe');
select has_function(
  'public',
  'create_server_category',
  array['uuid', 'text'],
  'create_server_category existe'
);
select has_function(
  'public',
  'create_server_channel',
  array['uuid', 'text', 'uuid', 'text', 'text', 'integer', 'boolean'],
  'create_server_channel existe'
);
select has_function(
  'public',
  'create_server_role',
  array['uuid', 'text', 'text', 'bigint', 'boolean'],
  'create_server_role existe'
);
select has_function(
  'public',
  'move_server_role',
  array['uuid', 'integer'],
  'move_server_role existe'
);
select has_function(
  'public',
  'set_server_member_roles',
  array['uuid', 'uuid', 'uuid[]'],
  'set_server_member_roles existe'
);
select has_function(
  'public',
  'set_server_permission_override',
  array['uuid', 'text', 'uuid', 'uuid', 'bigint', 'bigint'],
  'set_server_permission_override existe'
);
select has_function(
  'public',
  'send_channel_message',
  array['uuid', 'text', 'uuid', 'jsonb', 'uuid[]', 'uuid[]'],
  'send_channel_message existe'
);
select has_function(
  'public',
  'get_channel_messages',
  array['uuid', 'timestamp with time zone', 'uuid', 'integer'],
  'get_channel_messages existe'
);
select has_function(
  'public',
  'edit_channel_message',
  array['uuid', 'text'],
  'edit_channel_message existe'
);
select has_function(
  'public',
  'delete_channel_message',
  array['uuid'],
  'delete_channel_message existe'
);
select has_function(
  'public',
  'toggle_message_reaction',
  array['uuid', 'text'],
  'toggle_message_reaction existe'
);
select has_function(
  'public',
  'toggle_pin_channel_message',
  array['uuid'],
  'toggle_pin_channel_message existe'
);
select has_function(
  'public',
  'mark_channel_read',
  array['uuid', 'uuid'],
  'mark_channel_read existe'
);
select is(
  (select count(*)::integer from storage.buckets where id = 'message-attachments'),
  1,
  'o bucket privado de anexos existe'
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
  '78000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'owner.phase78@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Owner Phase 78","handle":"ownerphase78"}'::jsonb,
  now(),
  now()
),
(
  '78000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'member.phase78@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Member Phase 78","handle":"memberphase78"}'::jsonb,
  now(),
  now()
),
(
  '78000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'outsider.phase78@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Outsider Phase 78","handle":"outsiderphase78"}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"78000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select set_config(
      'crypt_test.phase78_server',
      public.create_server('Comunidade Phase 7–8', 'Canais e mensagens seguros.')::text,
      true
    )
  $$,
  'o proprietário cria o servidor'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.phase78_category',
      public.create_server_category(
        current_setting('crypt_test.phase78_server')::uuid,
        '🎨 Arte e Criação'
      )::text,
      true
    )
  $$,
  'a categoria aceita acento, espaços e emoji'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.phase78_channel',
      public.create_server_channel(
        current_setting('crypt_test.phase78_server')::uuid,
        'Games e Resenha 🎮',
        current_setting('crypt_test.phase78_category')::uuid,
        '🎮',
        'Partidas com amigos.',
        0,
        false
      )::text,
      true
    )
  $$,
  'o canal rico é criado'
);
select is(
  (
    select channel_name
    from public.get_server_channels(current_setting('crypt_test.phase78_server')::uuid)
    where channel_id = current_setting('crypt_test.phase78_channel')::uuid
  ),
  'Games e Resenha 🎮',
  'o nome rico do canal é preservado'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.phase78_role',
      public.create_server_role(
        current_setting('crypt_test.phase78_server')::uuid,
        'Criadores',
        '#8B5CF6',
        12672,
        true
      )::text,
      true
    )
  $$,
  'o cargo com permissões é criado'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.phase78_role_two',
      public.create_server_role(
        current_setting('crypt_test.phase78_server')::uuid,
        'Moderação',
        '#3B82F6',
        12672,
        true
      )::text,
      true
    )
  $$,
  'um segundo cargo é criado para validar a hierarquia'
);
select lives_ok(
  $$
    select public.set_server_member_roles(
      current_setting('crypt_test.phase78_server')::uuid,
      '78000000-0000-0000-0000-000000000001',
      array[current_setting('crypt_test.phase78_role')::uuid]
    )
  $$,
  'o proprietário pode receber um cargo visual'
);
select is(
  (
    select cardinality(role_ids)
    from public.get_server_member_roles(current_setting('crypt_test.phase78_server')::uuid)
    where profile_id = '78000000-0000-0000-0000-000000000001'
  ),
  1,
  'o cargo do proprietário é retornado'
);
select lives_ok(
  $$
    select public.move_server_role(
      current_setting('crypt_test.phase78_role')::uuid,
      -1
    )
  $$,
  'o proprietário move um cargo para cima'
);
select ok(
  (
    select role_position
    from public.get_server_roles(current_setting('crypt_test.phase78_server')::uuid)
    where role_id = current_setting('crypt_test.phase78_role')::uuid
  ) > (
    select role_position
    from public.get_server_roles(current_setting('crypt_test.phase78_server')::uuid)
    where role_id = current_setting('crypt_test.phase78_role_two')::uuid
  ),
  'a nova ordem dos cargos é persistida'
);
select lives_ok(
  $$
    select public.set_server_permission_override(
      current_setting('crypt_test.phase78_server')::uuid,
      'channel',
      current_setting('crypt_test.phase78_channel')::uuid,
      current_setting('crypt_test.phase78_role')::uuid,
      0,
      256
    )
  $$,
  'uma exceção de canal por cargo é salva'
);
select is(
  public.can_view_channel(current_setting('crypt_test.phase78_channel')::uuid),
  true,
  'o proprietário sempre enxerga o canal'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.phase78_message',
      public.send_channel_message(
        current_setting('crypt_test.phase78_channel')::uuid,
        'Primeira mensagem segura.',
        null,
        '[]'::jsonb,
        '{}'::uuid[],
        '{}'::uuid[]
      )::text,
      true
    )
  $$,
  'uma mensagem é enviada'
);
select is(
  (
    select count(*)::integer
    from public.get_channel_messages(
      current_setting('crypt_test.phase78_channel')::uuid,
      null,
      null,
      50
    )
  ),
  1,
  'o histórico paginado retorna a mensagem'
);
select lives_ok(
  $$
    select public.edit_channel_message(
      current_setting('crypt_test.phase78_message')::uuid,
      'Mensagem editada.'
    )
  $$,
  'o autor edita a própria mensagem'
);
select is(
  (
    select content
    from public.get_channel_messages(
      current_setting('crypt_test.phase78_channel')::uuid,
      null,
      null,
      50
    )
    where message_id = current_setting('crypt_test.phase78_message')::uuid
  ),
  'Mensagem editada.',
  'o histórico retorna a edição'
);
select is(
  public.toggle_message_reaction(
    current_setting('crypt_test.phase78_message')::uuid,
    '💜'
  ),
  true,
  'a reação é adicionada'
);
select is(
  public.toggle_pin_channel_message(current_setting('crypt_test.phase78_message')::uuid),
  true,
  'a mensagem é fixada'
);
select lives_ok(
  $$
    select public.mark_channel_read(
      current_setting('crypt_test.phase78_channel')::uuid,
      current_setting('crypt_test.phase78_message')::uuid
    )
  $$,
  'o canal é marcado como lido'
);
select is(
  (
    select unread_count::integer
    from public.get_server_unread_counts(current_setting('crypt_test.phase78_server')::uuid)
    where channel_id = current_setting('crypt_test.phase78_channel')::uuid
  ),
  0,
  'não há mensagens próprias não lidas'
);
select throws_ok(
  $$
    insert into public.channel_messages (
      server_id,
      channel_id,
      author_id,
      content
    )
    values (
      current_setting('crypt_test.phase78_server')::uuid,
      current_setting('crypt_test.phase78_channel')::uuid,
      auth.uid(),
      'inserção direta'
    )
  $$,
  '42501',
  null,
  'o cliente não insere mensagens diretamente'
);
select is(
  public.can_upload_message_attachment(
    current_setting('crypt_test.phase78_server')
      || '/'
      || current_setting('crypt_test.phase78_channel')
      || '/78000000-0000-0000-0000-000000000001/'
      || gen_random_uuid()::text
      || '.png'
  ),
  true,
  'um caminho privado de anexo válido é aceito'
);
select is(
  public.can_upload_message_attachment('fora/do/padrao.png'),
  false,
  'um caminho inseguro de anexo é recusado'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.phase78_invite',
      public.create_server_invite(
        current_setting('crypt_test.phase78_server')::uuid,
        24,
        2
      ),
      true
    )
  $$,
  'um convite para o segundo membro é criado'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"78000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.join_server_by_invite(current_setting('crypt_test.phase78_invite'))$$,
  'o segundo perfil entra no servidor'
);
select is(
  (
    select count(*)::integer
    from public.get_server_channels(current_setting('crypt_test.phase78_server')::uuid)
  ),
  2,
  'o membro enxerga os dois canais permitidos'
);
select lives_ok(
  $$
    select public.send_channel_message(
      current_setting('crypt_test.phase78_channel')::uuid,
      'Mensagem do segundo membro.',
      null,
      '[]'::jsonb,
      '{}'::uuid[],
      '{}'::uuid[]
    )
  $$,
  'o cargo padrão pode enviar mensagem'
);
select lives_ok(
  $$select public.mark_channel_read(current_setting('crypt_test.phase78_channel')::uuid, null)$$,
  'o membro marca o canal como lido'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"78000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.get_server_channels(current_setting('crypt_test.phase78_server')::uuid)$$,
  '42501',
  'server_membership_required',
  'um perfil de fora não lista canais'
);
select throws_ok(
  $$
    select public.send_channel_message(
      current_setting('crypt_test.phase78_channel')::uuid,
      'Tentativa externa.',
      null,
      '[]'::jsonb,
      '{}'::uuid[],
      '{}'::uuid[]
    )
  $$,
  '42501',
  'send_messages_required',
  'um perfil de fora não envia mensagens'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"78000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.delete_channel_message(current_setting('crypt_test.phase78_message')::uuid),
  '{}'::text[],
  'a exclusão retorna a lista de anexos para limpeza'
);
select is(
  (
    select count(*)::integer
    from public.get_channel_messages(
      current_setting('crypt_test.phase78_channel')::uuid,
      null,
      null,
      50
    )
    where message_id = current_setting('crypt_test.phase78_message')::uuid
      and deleted_at is not null
      and content is null
  ),
  1,
  'a mensagem é excluída de forma lógica'
);
select is(
  public.get_server_message_attachment_paths(
    current_setting('crypt_test.phase78_server')::uuid
  ),
  '{}'::text[],
  'a limpeza do servidor consulta anexos privados'
);
select lives_ok(
  $$
    select public.update_server_role(
      (
        select role_id
        from public.get_server_roles(current_setting('crypt_test.phase78_server')::uuid)
        where is_default
      ),
      '@everyone',
      '#7C3AED',
      79744,
      false
    )
  $$,
  'o proprietário atualiza permissões do cargo padrão'
);
select is(
  (
    select role_name
    from public.get_server_roles(current_setting('crypt_test.phase78_server')::uuid)
    where is_default
  ),
  '@everyone',
  'o nome protegido do cargo padrão permanece'
);
select lives_ok(
  $$
    select public.set_server_member_roles(
      current_setting('crypt_test.phase78_server')::uuid,
      '78000000-0000-0000-0000-000000000002',
      array[current_setting('crypt_test.phase78_role')::uuid]
    )
  $$,
  'o proprietário atribui um cargo ao membro'
);
select is(
  (
    select cardinality(role_ids)
    from public.get_server_member_roles(current_setting('crypt_test.phase78_server')::uuid)
    where profile_id = '78000000-0000-0000-0000-000000000002'
  ),
  1,
  'a atribuição de cargo é retornada'
);
select throws_ok(
  $$
    insert into public.server_permission_overrides (
      server_id,
      channel_id,
      role_id,
      allow_permissions,
      deny_permissions
    )
    values (
      current_setting('crypt_test.phase78_server')::uuid,
      current_setting('crypt_test.phase78_channel')::uuid,
      current_setting('crypt_test.phase78_role')::uuid,
      128,
      0
    )
  $$,
  '42501',
  null,
  'o cliente não altera permissões diretamente'
);

select * from finish();
rollback;
