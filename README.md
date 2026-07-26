# Crypt

Plataforma social de comunidades, conversas, amizades e descoberta de pessoas por interesses, com
identidade visual em roxo e azul.

## Estado atual — Fases 7 e 8

Além de autenticação, perfil, onboarding, conexões e servidores, a entrega unificada adiciona:

- categorias e canais de texto persistidos;
- nomes com espaços, maiúsculas, acentos e emojis, mantendo UUID como identificador;
- ícone, tópico, ordenação, modo lento e canal somente para leitura;
- cargos personalizados com cor, agrupamento de membros e hierarquia reordenável;
- cargo `@everyone` editável, protegido contra renomeação e exclusão;
- permissões no servidor e sobrescritas por categoria ou canal;
- atribuição de cargos aos membros, inclusive ao proprietário para personalização visual;
- mensagens em tempo real e histórico paginado por cursor;
- respostas, edição, exclusão lógica, reações e mensagens fixadas;
- menções, contadores de não lidas e indicador de digitação;
- até três anexos privados por mensagem, com 5 MB por arquivo;
- limpeza de anexos ao excluir mensagem, servidor ou conta;
- RLS, RPCs protegidas e isolamento de canais por permissão;
- 62 verificações pgTAP próprias das Fases 7–8 e 50 testes de interface e domínio.

## Tecnologias

- React 19, TypeScript, Vite e Tailwind CSS
- React Router e TanStack Query
- React Hook Form, Zod e Radix UI
- Supabase Auth, PostgreSQL, Storage, Realtime, RLS e Edge Functions
- Vitest, Testing Library, pgTAP, ESLint e Prettier

## Requisitos

- Node.js 24
- npm 11
- Git
- conta gratuita no Supabase
- Docker Desktop somente para executar Supabase local e testes SQL

## Instalação

```powershell
cd C:\Users\Snow\Documents\Crypt
npm ci
```

## Variáveis de ambiente

Copie o exemplo somente na primeira configuração:

```powershell
Copy-Item .env.example .env.local
code .env.local
```

Use somente os dados públicos exibidos pelo botão **Connect** do Supabase:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
VITE_LIVEKIT_URL=
```

Nunca coloque Secret key, `service_role`, senha do banco ou credenciais do LiveKit nesse arquivo.

## Aplicar as migrations

```powershell
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase migration list
npm run supabase:db:push
```

As migrations novas são:

1. `20260726050000_phase7_channels_roles_permissions.sql`;
2. `20260726060000_phase8_channel_messages.sql`;
3. `20260726210000_phase78_role_hierarchy_order.sql`.

Elas criam tabelas, funções, índices, buckets, policies, publicação Realtime e a movimentação segura
da hierarquia de cargos. Não crie esses recursos manualmente no painel.

## Publicar a Edge Function

A versão nova de `delete-account` também limpa anexos de mensagens:

```powershell
npx supabase secrets set "ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173"
npm run supabase:functions:deploy
```

## Executar

```powershell
npm run dev
```

Rotas principais:

- `/cadastro`, `/login`, `/recuperar-senha`, `/redefinir-senha`
- `/onboarding`
- `/app`
- `/app/servidores`
- `/app/servidores/{uuid}`
- `/app/servidores/{uuid}/gerenciar`
- `/app/servidores/{uuid}/canais/{uuid-do-canal}`
- `/app/servidores/{uuid}/configuracoes`
- `/app/convite/{codigo}`
- `/app/conexoes`
- `/app/pessoas/@identificador`
- `/app/perfil`, `/app/perfil/editar`, `/app/conta`

## Validação

```powershell
npm run validate
```

Com Docker Desktop aberto:

```powershell
npm run supabase:start
npm run supabase:test
npm run supabase:stop
```

## Estrutura principal

```text
src/
├── app/
├── components/
├── features/
│   ├── auth/
│   ├── connections/
│   ├── messages/
│   ├── onboarding/
│   ├── profile/
│   ├── servers/
│   └── workspace/
├── lib/
├── routes/
└── types/
supabase/
├── functions/
├── migrations/
└── tests/database/
```

## Segurança e privacidade

- o navegador recebe apenas URL e Publishable key;
- e-mail, senha e tokens não entram no perfil público;
- RLS e RPCs validam novamente cada ação;
- canais invisíveis não aparecem nem abrem por URL direta;
- hierarquia impede gerentes de administrar cargos iguais ou superiores ao próprio;
- mensagens, reações e leitura não possuem escrita direta do cliente;
- conteúdo é renderizado como texto, nunca como HTML;
- anexos usam bucket privado, caminho com UUIDs e URLs assinadas de 15 minutos;
- modo lento, somente leitura, resposta e menções são validados no banco;
- bloqueios continuam impedindo futuras mensagens diretas;
- segredos administrativos ficam somente na Edge Function.

Consulte:

- [docs/security.md](docs/security.md)
- [docs/database.md](docs/database.md)
- [docs/profile-onboarding.md](docs/profile-onboarding.md)
- [docs/connections.md](docs/connections.md)
- [docs/servers-members.md](docs/servers-members.md)
- [docs/channels-messages.md](docs/channels-messages.md)

### Nota da auditoria

O `npm audit` pode sinalizar `GHSA-qwww-vcr4-c8h2` no React Router. O aviso afeta APIs instáveis de
RSC, que não são usadas neste aplicativo SPA. Não execute `npm audit fix --force`.

## Limitações atuais

- o envio padrão de e-mails do Supabase é apropriado apenas para testes;
- presença depende de a aplicação permanecer aberta;
- busca global no histórico ainda não foi adicionada;
- mensagens diretas ainda não foram adicionadas;
- moderação completa, publicação web, Windows e Android ficam para fases posteriores.

## Próxima fase

A Fase 9 implementará mensagens diretas entre amigos, reutilizando a barreira de privacidade e
bloqueios já existente.
