begin;

create extension if not exists pgtap with schema extensions;

select plan(83);

select has_table('public', 'servers', 'servers existe');
select has_table('public', 'server_members', 'server_members existe');
select has_table('public', 'server_roles', 'server_roles existe');
select has_table('public', 'server_channels', 'server_channels existe');
select has_table('public', 'server_invites', 'server_invites existe');
select has_table('public', 'server_bans', 'server_bans existe');
select has_function('public', 'create_server', array['text', 'text'], 'create_server existe');
select has_function('public', 'get_my_servers', array[]::text[], 'get_my_servers existe');
select has_function(
  'public',
  'get_server_overview',
  array['uuid'],
  'get_server_overview existe'
);
select has_function(
  'public',
  'get_server_members',
  array['uuid'],
  'get_server_members existe'
);
select has_function(
  'public',
  'update_server_settings',
  array['uuid', 'text', 'text', 'text', 'text'],
  'update_server_settings existe'
);
select has_function(
  'public',
  'create_server_invite',
  array['uuid', 'integer', 'integer'],
  'create_server_invite existe'
);
select has_function(
  'public',
  'get_server_invites',
  array['uuid'],
  'get_server_invites existe'
);
select has_function(
  'public',
  'get_server_invite_preview',
  array['text'],
  'get_server_invite_preview existe'
);
select has_function(
  'public',
  'join_server_by_invite',
  array['text'],
  'join_server_by_invite existe'
);
select has_function(
  'public',
  'revoke_server_invite',
  array['uuid'],
  'revoke_server_invite existe'
);
select has_function('public', 'leave_server', array['uuid'], 'leave_server existe');
select has_function(
  'public',
  'transfer_server_ownership',
  array['uuid', 'uuid'],
  'transfer_server_ownership existe'
);
select has_function(
  'public',
  'delete_server',
  array['uuid', 'text'],
  'delete_server existe'
);
select has_function(
  'public',
  'is_server_member',
  array['uuid'],
  'is_server_member existe'
);
select has_function(
  'public',
  'is_server_owner',
  array['uuid'],
  'is_server_owner existe'
);
select has_function(
  'public',
  'can_manage_server_media',
  array['text'],
  'can_manage_server_media existe'
);
select is(
  (
    select count(*)::integer
    from storage.buckets
    where id = 'server-media'
  ),
  1,
  'o bucket de mídia dos servidores existe'
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
  '60000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'kaio.phase6@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Kaio Snow","handle":"kaiophase6"}'::jsonb,
  now(),
  now()
),
(
  '60000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'luna.phase6@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Luna Crypt","handle":"lunaphase6"}'::jsonb,
  now(),
  now()
),
(
  '60000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'theo.phase6@example.com',
  crypt('SenhaSegura123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Theo Crypt","handle":"theophase6"}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    insert into public.servers (name, owner_id)
    values ('Inseguro', '60000000-0000-0000-0000-000000000001')
  $$,
  '42501',
  null,
  'o cliente não cria servidor diretamente'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.server_id',
      public.create_server('  Órbita Phase 6  ', '  Comunidade privada de teste.  ')::text,
      true
    )
  $$,
  'a função cria um servidor completo'
);
select is(
  (select count(*)::integer from public.get_my_servers()),
  1,
  'o servidor aparece na lista do criador'
);
select is(
  (
    select server_name
    from public.get_my_servers()
    where server_id = current_setting('crypt_test.server_id')::uuid
  ),
  'Órbita Phase 6',
  'o nome é normalizado sem perder maiúsculas'
);
select is(
  (
    select member_count::integer
    from public.get_server_overview(current_setting('crypt_test.server_id')::uuid)
  ),
  1,
  'o proprietário entra como primeiro membro'
);
select is(
  (
    select count(*)::integer
    from public.get_server_members(current_setting('crypt_test.server_id')::uuid)
  ),
  1,
  'a lista inicial possui somente o proprietário'
);
select is(
  (
    select count(*)::integer
    from public.server_roles
    where server_id = current_setting('crypt_test.server_id')::uuid
      and is_default
      and is_system
  ),
  1,
  'um cargo padrão de sistema é criado'
);
select is(
  (
    select count(*)::integer
    from public.server_channels
    where server_id = current_setting('crypt_test.server_id')::uuid
  ),
  1,
  'um canal inicial é criado'
);
select is(
  (
    select name
    from public.server_channels
    where server_id = current_setting('crypt_test.server_id')::uuid
  ),
  'Conversa Geral',
  'o canal inicial preserva espaços e maiúsculas'
);
select is(
  public.is_server_owner(current_setting('crypt_test.server_id')::uuid),
  true,
  'o criador é reconhecido como proprietário'
);
select is(
  public.is_server_member(current_setting('crypt_test.server_id')::uuid),
  true,
  'o criador é reconhecido como membro'
);
select is(
  public.can_manage_server_media(
    current_setting('crypt_test.server_id')
      || '/icon-70000000-0000-0000-0000-000000000001.jpg'
  ),
  true,
  'o proprietário pode gerenciar uma mídia válida do servidor'
);
select is(
  public.can_manage_server_media('fora-do-padrao/icone.jpg'),
  false,
  'um caminho fora do padrão é recusado'
);
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'server-media',
      current_setting('crypt_test.server_id')
        || '/icon-70000000-0000-0000-0000-000000000001.jpg',
      auth.uid()
    )
  $$,
  'a policy permite inserir mídia ao proprietário'
);
select lives_ok(
  $$
    delete from storage.objects
    where bucket_id = 'server-media'
      and name = current_setting('crypt_test.server_id')
        || '/icon-70000000-0000-0000-0000-000000000001.jpg'
  $$,
  'a policy permite remover mídia ao proprietário'
);
select lives_ok(
  $$
    select public.update_server_settings(
      current_setting('crypt_test.server_id')::uuid,
      'Órbita Phase 6',
      'Descrição atualizada.',
      null,
      null
    )
  $$,
  'o proprietário altera configurações básicas'
);
select is(
  (
    select server_description
    from public.get_server_overview(current_setting('crypt_test.server_id')::uuid)
  ),
  'Descrição atualizada.',
  'a descrição atualizada é retornada'
);
select throws_ok(
  $$select public.create_server('A', null)$$,
  '22023',
  'invalid_server_name',
  'nome curto é recusado no backend'
);
select throws_ok(
  $$
    select public.create_server_invite(
      current_setting('crypt_test.server_id')::uuid,
      0,
      null
    )
  $$,
  '22023',
  'invalid_invite_expiration',
  'validade inválida é recusada'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.invite_luna',
      public.create_server_invite(
        current_setting('crypt_test.server_id')::uuid,
        168,
        5
      ),
      true
    )
  $$,
  'um membro cria convite com validade e limite'
);
select is(
  (
    select count(*)::integer
    from public.get_server_invites(current_setting('crypt_test.server_id')::uuid)
  ),
  1,
  'o convite ativo aparece na lista'
);
select matches(
  current_setting('crypt_test.invite_luna'),
  '^[a-f0-9]{36}$',
  'o código aleatório possui formato difícil de adivinhar'
);
select throws_ok(
  $$
    insert into public.server_invites (
      server_id,
      code,
      created_by
    )
    values (
      current_setting('crypt_test.server_id')::uuid,
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '60000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  null,
  'o cliente não cria convite diretamente'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.servers
    where id = current_setting('crypt_test.server_id')::uuid
  ),
  0,
  'uma pessoa de fora não lê o servidor diretamente'
);
select is(
  (
    select count(*)::integer
    from public.server_members
    where server_id = current_setting('crypt_test.server_id')::uuid
  ),
  0,
  'uma pessoa de fora não enumera membros'
);
select throws_ok(
  $$
    select *
    from public.get_server_overview(current_setting('crypt_test.server_id')::uuid)
  $$,
  '42501',
  'server_membership_required',
  'uma pessoa de fora não abre detalhes por RPC'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'server-media',
      current_setting('crypt_test.server_id')
        || '/banner-70000000-0000-0000-0000-000000000002.jpg',
      auth.uid()
    )
  $$,
  '42501',
  null,
  'uma pessoa de fora não envia mídia ao servidor'
);
select is(
  (
    select count(*)::integer
    from public.get_server_invite_preview(current_setting('crypt_test.invite_luna'))
    where server_name = 'Órbita Phase 6'
  ),
  1,
  'um convite válido mostra apenas a prévia necessária'
);
select lives_ok(
  $$select public.join_server_by_invite(current_setting('crypt_test.invite_luna'))$$,
  'uma pessoa entra com convite válido'
);
select throws_ok(
  $$select public.join_server_by_invite(current_setting('crypt_test.invite_luna'))$$,
  '23505',
  'already_server_member',
  'a mesma pessoa não entra duas vezes'
);
select is(
  (select count(*)::integer from public.get_my_servers()),
  1,
  'o servidor aparece para o novo membro'
);
select is(
  (
    select count(*)::integer
    from public.get_server_members(current_setting('crypt_test.server_id')::uuid)
  ),
  2,
  'os dois membros aparecem na lista privada'
);
select is(
  (
    select count(*)::integer
    from public.get_public_profile_by_handle('@kaiophase6')
    where profile_id = '60000000-0000-0000-0000-000000000001'
  ),
  1,
  'membros do mesmo servidor podem abrir o perfil pelo identificador'
);
select throws_ok(
  $$
    insert into public.server_members (server_id, profile_id)
    values (
      current_setting('crypt_test.server_id')::uuid,
      '60000000-0000-0000-0000-000000000003'
    )
  $$,
  '42501',
  null,
  'o cliente não adiciona membro sem convite'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.servers
    where id = current_setting('crypt_test.server_id')::uuid
  ),
  0,
  'um terceiro não lê o servidor'
);
select throws_ok(
  $$
    select *
    from public.get_server_members(current_setting('crypt_test.server_id')::uuid)
  $$,
  '42501',
  'server_membership_required',
  'um terceiro não consulta a lista de membros'
);
select throws_ok(
  $$
    select public.create_server_invite(
      current_setting('crypt_test.server_id')::uuid,
      24,
      null
    )
  $$,
  '42501',
  'server_membership_required',
  'um terceiro não cria convite'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.transfer_server_ownership(
      current_setting('crypt_test.server_id')::uuid,
      '60000000-0000-0000-0000-000000000003'
    )
  $$,
  '22023',
  'new_owner_must_be_member',
  'a propriedade não vai para uma pessoa de fora'
);
select lives_ok(
  $$
    select public.transfer_server_ownership(
      current_setting('crypt_test.server_id')::uuid,
      '60000000-0000-0000-0000-000000000002'
    )
  $$,
  'o proprietário transfere para outro membro'
);
select is(
  public.is_server_owner(current_setting('crypt_test.server_id')::uuid),
  false,
  'o proprietário anterior perde o controle máximo'
);
select lives_ok(
  $$select public.leave_server(current_setting('crypt_test.server_id')::uuid)$$,
  'o membro anterior sai depois da transferência'
);
select is(
  (select count(*)::integer from public.get_my_servers()),
  0,
  'o servidor sai da lista de quem deixou a comunidade'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.is_server_owner(current_setting('crypt_test.server_id')::uuid),
  true,
  'a nova proprietária recebe o controle máximo'
);
select throws_ok(
  $$select public.leave_server(current_setting('crypt_test.server_id')::uuid)$$,
  '42501',
  'server_owner_must_transfer_or_delete',
  'a proprietária não sai sem transferir ou excluir'
);
select lives_ok(
  $$
    select public.update_server_settings(
      current_setting('crypt_test.server_id')::uuid,
      'Comunidade Crypt',
      'Novo nome após transferência.',
      null,
      null
    )
  $$,
  'a nova proprietária altera o servidor'
);
select is(
  (
    select server_name
    from public.get_server_overview(current_setting('crypt_test.server_id')::uuid)
  ),
  'Comunidade Crypt',
  'o novo nome fica visível aos membros'
);
select throws_ok(
  $$
    select public.delete_server(
      current_setting('crypt_test.server_id')::uuid,
      'nome errado'
    )
  $$,
  '22023',
  'server_name_confirmation_mismatch',
  'a exclusão exige o nome atual exato'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.invite_revoked',
      public.create_server_invite(
        current_setting('crypt_test.server_id')::uuid,
        24,
        1
      ),
      true
    )
  $$,
  'a proprietária cria um convite revogável'
);
select lives_ok(
  $$
    select public.revoke_server_invite(
      (
        select invite_id
        from public.get_server_invites(current_setting('crypt_test.server_id')::uuid)
        where invite_code = current_setting('crypt_test.invite_revoked')
      )
    )
  $$,
  'a proprietária revoga um convite'
);
select is(
  (
    select count(*)::integer
    from public.get_server_invite_preview(current_setting('crypt_test.invite_revoked'))
  ),
  0,
  'convite revogado não produz prévia'
);
select lives_ok(
  $$
    select set_config(
      'crypt_test.invite_theo',
      public.create_server_invite(
        current_setting('crypt_test.server_id')::uuid,
        24,
        1
      ),
      true
    )
  $$,
  'a proprietária cria outro convite válido'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.join_server_by_invite(current_setting('crypt_test.invite_theo'))$$,
  'o terceiro entra pelo novo convite'
);
select is(
  (
    select count(*)::integer
    from public.get_server_members(current_setting('crypt_test.server_id')::uuid)
  ),
  2,
  'a lista reflete entrada e saída anteriores'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.transfer_server_ownership(
      current_setting('crypt_test.server_id')::uuid,
      '60000000-0000-0000-0000-000000000003'
    )
  $$,
  'a propriedade pode ser transferida novamente'
);
select lives_ok(
  $$select public.leave_server(current_setting('crypt_test.server_id')::uuid)$$,
  'a antiga proprietária sai após transferir'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.is_server_owner(current_setting('crypt_test.server_id')::uuid),
  true,
  'o último membro é o proprietário atual'
);
select throws_ok(
  $$select public.leave_server(current_setting('crypt_test.server_id')::uuid)$$,
  '42501',
  'server_owner_must_transfer_or_delete',
  'o último proprietário também não pode abandonar o servidor'
);
select lives_ok(
  $$
    select public.delete_server(
      current_setting('crypt_test.server_id')::uuid,
      'Comunidade Crypt'
    )
  $$,
  'o proprietário exclui com confirmação explícita'
);
select is(
  (select count(*)::integer from public.get_my_servers()),
  0,
  'o servidor excluído desaparece da lista'
);
select is(
  (
    select count(*)::integer
    from public.servers
    where id = current_setting('crypt_test.server_id')::uuid
  ),
  0,
  'o servidor foi removido com seus relacionamentos'
);

reset role;

select * from finish();

rollback;
