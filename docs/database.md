# Banco de dados — Fases 3 a 5

## Migrations

| Ordem | Arquivo                                        | Responsabilidade                          |
| ----- | ---------------------------------------------- | ----------------------------------------- |
| 1     | `20260725143000_phase3_auth_profiles.sql`      | Auth, perfil mínimo e `@`                 |
| 2     | `20260725200000_phase4_profile_onboarding.sql` | Perfil, interesses e Storage              |
| 3     | `20260725223000_phase5_connections.sql`        | Amizades, sugestões, bloqueios e presença |

As migrations são aplicadas somente pela CLI:

```powershell
npm run supabase:db:push
```

## `public.profiles`

| Coluna                           | Regra                                             |
| -------------------------------- | ------------------------------------------------- |
| `id`                             | UUID de `auth.users`, chave primária, cascata     |
| `display_name`                   | 2–48 caracteres; repetição permitida              |
| `handle`                         | minúsculo, único e pesquisável                    |
| `avatar_path`                    | somente a pasta UUID do próprio perfil            |
| `bio`                            | opcional, até 280 caracteres                      |
| `favorite_spotify_url`           | somente `https://open.spotify.com/track/{id}`     |
| `favorite_spotify_title`         | identificação segura da faixa, até 200 caracteres |
| `favorite_spotify_thumbnail_url` | opcional, somente `https://i.scdn.co/image/...`   |
| `created_at` / `updated_at`      | datas UTC controladas pelo banco                  |

E-mail, senha e tokens permanecem exclusivamente nos schemas protegidos do Supabase.

Na Fase 5, a leitura direta de `profiles` foi limitada à própria linha. Busca e perfis públicos usam
funções específicas para aplicar descoberta, bloqueio e limites antes de retornar dados.

## `public.profile_settings`

Uma linha 1:1 é criada automaticamente para cada perfil. Ela armazena:

- etapa e conclusão do onboarding;
- exibição dos interesses no perfil;
- uso separado em sugestões;
- opção prioritária para ocultar tudo;
- pedidos de amizade;
- mensagens privadas;
- status online;
- amigos e servidores em comum.
- consentimento separado para aparecer na busca pelo `@`.

Interesses e sugestões começam desativados. Somente o dono lê ou atualiza a própria linha. Decisões
sociais futuras deverão usar funções específicas, sem expor o progresso interno do onboarding.

## Catálogo de interesses

`interest_categories` contém cinco categorias controladas e `interests` contém 63 itens seedados
pela migration. Clientes autenticados podem ler, mas não criar, editar ou excluir itens do catálogo.

`profile_interests` usa chave composta `(profile_id, interest_id)`. A leitura permite:

1. o dono sempre ver a própria seleção;
2. outra pessoa ver somente quando `show_interests_on_profile = true`;
3. `hide_all_interests = true` ocultar a seleção independentemente das outras opções.

Não existe permissão direta de insert, update ou delete para o cliente.

`can_view_profile_interests(profile_id)` consulta as preferências como função protegida e devolve
somente a decisão booleana. Assim, outra conta não precisa ler `profile_settings` para a RLS
funcionar.

## Funções SQL

### `set_profile_interests(category_slug, selected_interest_ids)`

Substitui atomicamente a seleção de uma categoria. A função:

- usa exclusivamente `auth.uid()`;
- valida a categoria;
- confirma que todos os IDs pertencem à categoria;
- remove a seleção anterior;
- insere IDs distintos;
- nunca aceita um `profile_id` enviado pelo cliente.

### `replace_my_interests(selected_interest_ids)`

Substitui atomicamente toda a seleção da pessoa autenticada e recusa IDs inexistentes.

As duas funções são `security definer`, usam `search_path` vazio e só podem ser executadas pelo papel
`authenticated`.

## Conexões

### `friend_requests`

Mantém somente pedidos pendentes. Um índice único usa o menor e o maior UUID para impedir pedidos
duplicados mesmo quando as direções são invertidas.

### `friendships`

Cada amizade ocupa uma única linha `(user_low_id, user_high_id)`. A constraint exige a ordem
canônica dos UUIDs e evita armazenar a mesma amizade duas vezes.

### `user_blocks`

O bloqueio é unidirecional, mas todas as ações consultam os dois sentidos. Bloquear remove
atomicamente pedidos pendentes e uma amizade existente.

### Sugestões, notificações e presença

- `dismissed_friend_suggestions`: oculta por 30 dias ou permanentemente;
- `connection_notifications`: pedido novo e pedido aceito, legíveis somente pelo destinatário;
- `user_reports`: denúncia privada, com motivo controlado e limite de repetição em 24 horas;
- `user_presence`: status e último sinal, visíveis somente para amigos quando autorizado.

As funções `send_friend_request`, `respond_friend_request`, `cancel_friend_request`,
`remove_friend`, `block_profile`, `unblock_profile` e `dismiss_friend_suggestion` derivam o autor de
`auth.uid()`. As tabelas não concedem `insert`, `update` ou `delete` direto ao cliente.

`get_friend_suggestions` calcula no banco:

- Música e Jogos: 4 pontos por interesse;
- Filmes/séries e Hobbies: 3 pontos;
- autodescrições: 1 ponto;
- amigo em comum: 5 pontos.

O cliente nunca envia score. Perfis já conectados, pendentes, bloqueados, não encontráveis,
desativados ou descartados são removidos antes do resultado.

## Storage

O bucket público `profile-media` guarda somente imagens de apresentação:

- limite por arquivo: 2 MB;
- MIME permitido: JPEG, PNG e WebP;
- pasta obrigatória: `{auth.uid()}/...`;
- extensão permitida: `jpg`, `jpeg`, `png` ou `webp`;
- insert, update, listagem e delete limitados à própria pasta.

O arquivo é público para permitir avatar em perfis visíveis. A associação no banco também exige que
o primeiro segmento de `avatar_path` seja igual ao UUID do perfil, impedindo apontar para o avatar
de outra conta.

## Testes

- `profiles_rls.test.sql`: criação, identificador e proteção da Fase 3.
- `profile_onboarding_rls.test.sql`: catálogo, defaults privados, RPCs, visibilidade, constraints,
  progresso e privilégios da Fase 4.
- `connections_rls.test.sql`: pedidos, amizade canônica, bloqueios, sugestões, notificações,
  presença, busca, privacidade e acessos de terceiros da Fase 5.

Execute com Docker Desktop aberto:

```powershell
npm run supabase:start
npm run supabase:test
npm run supabase:stop
```
