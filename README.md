# Crypt

Plataforma social de comunidades, conversas, amizades e descoberta de pessoas por interesses. O
Crypt possui identidade visual própria em roxo e azul e está sendo construído em fases para web,
Windows e Android.

## Estado atual — Fase 4

Além da autenticação real entregue na Fase 3, esta fase adiciona:

- onboarding privado com nove etapas e progresso persistente;
- nome de exibição e biografia editáveis;
- avatar JPG, PNG ou WebP de até 2 MB;
- Storage com pasta individual e políticas RLS;
- cinco categorias e 63 interesses opcionais;
- chips animados, navegação voltar e opção de pular categorias;
- autodescrições de personalidade sem diagnóstico;
- preferências independentes para perfil, sugestões, amizade, mensagens e presença;
- interesses ocultos por padrão;
- música favorita por link normalizado de faixa do Spotify;
- player oficial incorporado diretamente pelo ID validado da faixa;
- perfil responsivo sem exposição do e-mail;
- edição posterior de tudo que foi escolhido no onboarding;
- migrations, testes unitários e testes pgTAP de RLS.

## Tecnologias

- React 19 e TypeScript
- Vite e Tailwind CSS
- React Router
- Supabase Auth, PostgreSQL, Storage, RLS e Edge Functions
- TanStack Query
- React Hook Form e Zod
- Radix UI Dialog
- Lucide React
- Spotify Embed oficial
- Vitest, Testing Library e pgTAP
- Supabase CLI
- ESLint e Prettier

## Requisitos

- Node.js 24
- npm 11
- Git
- conta gratuita no Supabase
- Docker Desktop somente para executar o Supabase e os testes SQL localmente

O projeto hospedado pode receber migrations sem iniciar o ambiente Docker local.

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

Preencha com os dados públicos exibidos pelo botão **Connect** do projeto Supabase:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
VITE_LIVEKIT_URL=
```

Nunca coloque Secret key, `service_role`, senha do banco ou credenciais do LiveKit nesse arquivo.

## Aplicar as migrations

O projeto já deve estar vinculado ao Supabase:

```powershell
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase migration list
npm run supabase:db:push
```

A migration da Fase 4 cria catálogo, configurações, seleções e o bucket `profile-media`
automaticamente. Não é necessário criar tabelas ou políticas manualmente no painel.

## Edge Function da conta

A função de exclusão agora também limpa as mídias do perfil e deve ser publicada novamente:

```powershell
npx supabase secrets set "ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173"
npm run supabase:functions:deploy
```

## Executar

```powershell
npm run dev
```

Rotas principais:

- `/cadastro`
- `/login`
- `/recuperar-senha`
- `/redefinir-senha`
- `/auth/callback`
- `/onboarding`
- `/app`
- `/app/perfil`
- `/app/perfil/editar`
- `/app/conta`
- `/app/componentes`

Uma conta existente sem onboarding concluído será redirecionada para `/onboarding`. O progresso é
salvo no Supabase e continua após fechar o navegador.

## Validação

```powershell
npm run validate
```

Esse comando executa TypeScript, ESLint, testes, Prettier e build.

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
│   ├── common/
│   └── layout/
├── features/
│   ├── auth/
│   ├── onboarding/
│   └── profile/
│       ├── components/
│       ├── profile.errors.ts
│       ├── profile.queries.ts
│       ├── profile.schemas.ts
│       ├── profile.service.ts
│       └── profile.types.ts
├── lib/
├── routes/
└── types/
supabase/
├── functions/
├── migrations/
└── tests/database/
```

## Segurança e privacidade

- e-mail e senha nunca aparecem no perfil;
- interesses começam ocultos e seu uso em sugestões exige escolha separada;
- RLS controla leitura das seleções de interesses;
- funções SQL substituem seleções atomicamente e recusam IDs manipulados;
- avatar fica na pasta UUID da própria conta;
- tipo e tamanho do avatar são validados no cliente, bucket e políticas;
- o banco impede associar ao perfil o arquivo de outra conta;
- somente links HTTPS de faixas em `open.spotify.com` são aceitos;
- a capa aceita somente o domínio oficial `i.scdn.co`;
- o Spotify Embed é incorporado sem baixar ou hospedar áudio;
- segredos administrativos continuam fora do bundle.

Consulte [docs/security.md](docs/security.md), [docs/database.md](docs/database.md) e
[docs/profile-onboarding.md](docs/profile-onboarding.md).

### Nota da auditoria

O `npm audit` sinaliza `GHSA-qwww-vcr4-c8h2` no React Router. O aviso afeta APIs instáveis de RSC,
que não são usadas neste aplicativo SPA. Não execute `npm audit fix --force`.

## Limitações atuais

- o envio padrão de e-mails do Supabase é apropriado apenas para testes;
- o perfil aberto nesta fase é o da própria conta;
- busca de pessoas, amizades, bloqueios e perfis de terceiros pertencem à Fase 5;
- presença online real será conectada em uma fase posterior;
- mensagens e comunidades continuam simuladas;
- publicação web, Windows e Android será feita em fases posteriores.

## Próxima fase

A Fase 5 implementará busca por `@`, pedidos, amigos, bloqueios e sugestões transparentes por
interesses. Ela só começa após os testes reais da Fase 4 com duas contas.
