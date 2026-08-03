begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_table(
  'public',
  'security_rate_limits',
  'contador privado de credenciais temporárias existe'
);
select has_function(
  'public',
  'consume_livekit_token_rate_limit',
  array[]::text[],
  'limite de emissão LiveKit existe'
);
select table_privs_are(
  'public',
  'security_rate_limits',
  'authenticated',
  array[]::text[],
  'cliente não possui acesso direto aos contadores'
);
select function_privs_are(
  'public',
  'consume_livekit_token_rate_limit',
  array[]::text[],
  'authenticated',
  array['EXECUTE'],
  'sessão autenticada pode solicitar uma cota'
);
select function_privs_are(
  'public',
  'consume_livekit_token_rate_limit',
  array[]::text[],
  'anon',
  array[]::text[],
  'sessão anônima não usa a cota'
);

select is(
  (
    select count(*)::integer
    from pg_class as relation
    inner join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any (array[
        'channel_messages', 'channel_read_states', 'connection_notifications',
        'direct_conversation_participants', 'direct_conversations',
        'direct_message_attachments', 'direct_message_reactions', 'direct_messages',
        'dismissed_friend_suggestions', 'friend_requests', 'friendships',
        'interest_categories', 'interests', 'message_attachments',
        'message_channel_mentions', 'message_reactions', 'message_user_mentions',
        'notification_preferences', 'profile_interests', 'profile_settings', 'profiles',
        'push_deliveries', 'push_devices', 'security_rate_limits', 'server_audit_logs',
        'server_bans', 'server_categories', 'server_channels', 'server_invites',
        'server_member_roles', 'server_members', 'server_moderation_settings',
        'server_permission_overrides', 'server_reports', 'server_roles', 'servers',
        'user_blocks', 'user_notifications', 'user_presence', 'user_reports',
        'voice_channel_presence'
      ])
      and (not relation.relrowsecurity or not relation.relforcerowsecurity)
  ),
  0,
  'todas as tabelas sensíveis mantêm RLS habilitada e forçada'
);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    inner join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(procedure.proconfig, array[]::text[])) as configuration(value)
        where configuration.value like 'search_path=%'
      )
  ),
  0,
  'todas as funções security definer fixam o search_path'
);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    inner join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and procedure.proname <> 'is_handle_available'
      and has_function_privilege('anon', procedure.oid, 'EXECUTE')
  ),
  0,
  'anon não executa funções privilegiadas internas'
);

select is(
  (select count(*)::integer from storage.buckets where public),
  2,
  'somente os dois buckets de identidade pública são públicos'
);
select ok(
  (
    select bool_and(not public)
    from storage.buckets
    where id in ('message-attachments', 'direct-message-attachments', 'direct-group-media')
  ),
  'anexos de canais, mensagens privadas e grupos permanecem privados'
);
select ok(
  (
    select bool_and(
      not ('image/svg+xml' = any(allowed_mime_types))
      and not ('text/html' = any(allowed_mime_types))
    )
    from storage.buckets
    where id in (
      'profile-media', 'server-media', 'message-attachments',
      'direct-message-attachments', 'direct-group-media'
    )
  ),
  'Storage não aceita SVG nem HTML executável'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  'f0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'security.audit@example.com',
  crypt('SenhaSegura123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Security Audit","handle":"securityaudit"}'::jsonb,
  now(), now()
);

select throws_ok(
  $$select public.consume_livekit_token_rate_limit()$$,
  '42501',
  'authentication_required',
  'sem sessão não é possível consumir a cota'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"f0000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select bool_and(public.consume_livekit_token_rate_limit())
    from generate_series(1, 12)
  ),
  true,
  'as doze primeiras emissões dentro do minuto são aceitas'
);
select is(
  public.consume_livekit_token_rate_limit(),
  false,
  'a décima terceira emissão no mesmo minuto é recusada'
);

reset role;
update public.security_rate_limits
set window_started_at = now() - interval '2 minutes';
set local role authenticated;

select is(
  public.consume_livekit_token_rate_limit(),
  true,
  'uma nova janela de tempo restaura a emissão'
);

select * from finish();
rollback;
