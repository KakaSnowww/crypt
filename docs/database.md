# Banco de dados — Fase 3

## Migration

Arquivo:

`supabase/migrations/20260725143000_phase3_auth_profiles.sql`

A migration deve ser aplicada pela CLI com `npm run supabase:db:push`. Alterações manuais no Table
Editor não são necessárias.

## Tabela `public.profiles`

| Coluna         | Tipo          | Regra                                                          |
| -------------- | ------------- | -------------------------------------------------------------- |
| `id`           | `uuid`        | Mesmo ID de `auth.users`; chave primária e exclusão em cascata |
| `display_name` | `text`        | 2–48 caracteres, espaços e acentos permitidos                  |
| `handle`       | `text`        | 3–24 caracteres, minúsculo e único                             |
| `avatar_url`   | `text`        | Reservado para a Fase 4                                        |
| `bio`          | `text`        | Reservado para a Fase 4                                        |
| `created_at`   | `timestamptz` | Criado automaticamente                                         |
| `updated_at`   | `timestamptz` | Atualizado por gatilho                                         |

E-mail e senha não pertencem a essa tabela. Esses dados permanecem no schema protegido
`auth`, gerenciado pelo Supabase.

## Identificador `@`

O valor é armazenado sem `@` e sempre em minúsculas. A função `normalize_handle` garante que
`@KaioSnow`, `@kaiosnow` e `@KAIOSNOW` representem o mesmo identificador.

As constraints do banco rejeitam:

- menos de 3 ou mais de 24 caracteres;
- caracteres diferentes de `a-z`, `0-9` e `_`;
- letras maiúsculas no valor armazenado;
- nomes reservados;
- duplicações.

O RPC `is_handle_available` fornece uma verificação amigável antes do cadastro. A restrição `unique`
continua sendo a proteção definitiva contra duas tentativas simultâneas.

## Criação automática

O gatilho `on_auth_user_created` roda após a criação em `auth.users`. A função:

1. lê apenas `display_name` e `handle` dos metadados;
2. normaliza e valida os valores novamente;
3. cria `public.profiles`;
4. cancela o cadastro se os dados forem inválidos ou duplicados.

A função é `security definer` e possui `search_path` vazio para impedir desvio de objetos.

## Matriz de autorização

| Ação em `profiles` | Anônimo | Autenticado          | Dono            | Servidor protegido  |
| ------------------ | ------- | -------------------- | --------------- | ------------------- |
| Ler                | Não     | Sim, campos públicos | Sim             | Sim                 |
| Inserir            | Não     | Não                  | Não diretamente | Gatilho de cadastro |
| Atualizar          | Não     | Não em terceiros     | Sim             | Sim                 |
| Excluir            | Não     | Não                  | Não diretamente | Edge Function       |

A leitura usa uma política ampla apenas para o papel `authenticated`, pois a tabela contém
exclusivamente o diretório público do usuário. Nenhum e-mail, senha, token ou preferência privada
fica nessa tabela.

## Testes RLS

`supabase/tests/database/profiles_rls.test.sql` verifica:

- criação automática dos perfis;
- nomes de exibição repetidos;
- normalização sem diferença entre maiúsculas e minúsculas;
- bloqueio de nomes reservados;
- atualização do próprio perfil;
- bloqueio da alteração de terceiros;
- ausência de exclusão direta pelo cliente.

Execute com Docker Desktop aberto:

```powershell
npm run supabase:start
npm run supabase:test
npm run supabase:stop
```
