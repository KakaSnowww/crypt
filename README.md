# Crypt

Plataforma social de comunidades, conversas, amizades e descoberta de pessoas por interesses. O
Crypt possui identidade visual própria em roxo e azul e está sendo construído em fases para web,
Windows e Android.

## Estado atual — Fase 3

Esta fase conecta a base visual ao Supabase e entrega:

- cadastro com nome de exibição, e-mail, identificador `@` e senha;
- identificador normalizado, único e protegido contra nomes reservados;
- login e logout no dispositivo atual;
- confirmação de e-mail;
- recuperação e redefinição de senha;
- sessão persistente com renovação automática;
- callback de autenticação usando PKCE;
- rotas privadas com redirecionamento seguro;
- área de segurança para alteração de senha;
- exclusão protegida da conta por Edge Function;
- tabela `profiles` criada automaticamente após o cadastro;
- migration SQL versionada;
- Row Level Security e privilégios mínimos;
- testes unitários, de rotas e um conjunto pgTAP para RLS.

## Tecnologias

- React 19 e TypeScript
- Vite e Tailwind CSS
- React Router
- Supabase Auth, PostgreSQL, RLS e Edge Functions
- TanStack Query
- React Hook Form e Zod
- Radix UI Dialog
- Lucide React
- Vitest e Testing Library
- Supabase CLI
- ESLint e Prettier

## Requisitos

- Node.js 24
- npm 11
- Git
- conta gratuita no Supabase
- Docker Desktop somente para executar o Supabase e os testes SQL localmente

O projeto hospedado pode ser configurado e receber migrations sem iniciar o ambiente Docker local.

## Instalação

```powershell
cd C:\Users\Snow\Documents\Crypt
npm ci
```

## Configuração do Supabase

### 1. Criar o projeto

Crie um projeto gratuito em `https://database.new`. Guarde a senha do banco em um gerenciador de
senhas.

### 2. Configurar URLs de autenticação

No painel do Supabase, em **Authentication → URL Configuration**, configure:

- Site URL: `http://127.0.0.1:5173`
- Redirect URL: `http://127.0.0.1:5173/auth/callback`
- Redirect URL adicional: `http://localhost:5173/auth/callback`

Quando o Crypt for publicado, a URL HTTPS de produção também deverá ser adicionada.

### 3. Criar o arquivo local de ambiente

No botão **Connect** do projeto, copie a Project URL e a Publishable key. Depois:

```powershell
Copy-Item .env.example .env.local
code .env.local
```

Preencha:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
VITE_LIVEKIT_URL=
```

A Publishable key pode aparecer no navegador porque a autorização real está na RLS. Nunca coloque
uma Secret key ou `service_role` nesse arquivo.

### 4. Vincular a CLI e aplicar a migration

Encontre o Project Ref em **Project Settings → General**:

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npm run supabase:db:push
```

### 5. Publicar a exclusão segura de conta

```powershell
npx supabase secrets set "ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173"
npm run supabase:functions:deploy
```

A função recebe as chaves administrativas automaticamente no ambiente protegido do Supabase. Elas
não são copiadas para o frontend.

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
- `/app`
- `/app/conta`
- `/app/componentes`

## Validação

```powershell
npm run validate
```

Esse comando executa TypeScript, ESLint, testes, Prettier e build.

Com Docker Desktop aberto, também é possível validar a migration e a RLS localmente:

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
│   └── auth/
│       ├── components/
│       ├── AuthProvider.tsx
│       ├── ProtectedRoute.tsx
│       ├── auth.errors.ts
│       ├── auth.schemas.ts
│       └── auth.service.ts
├── lib/
│   ├── config/
│   └── supabase/
├── routes/
└── types/
supabase/
├── functions/
│   └── delete-account/
├── migrations/
└── tests/
    └── database/
```

## Segurança

- senhas existem somente no Supabase Auth;
- e-mail não é salvo em `public.profiles`;
- a chave administrativa nunca entra no bundle;
- dados do formulário são validados no frontend e no banco;
- a tabela pública possui RLS forçada;
- cadastro de perfil acontece por gatilho `security definer` com `search_path` vazio;
- URLs externas não podem ser usadas como redirecionamento após o login;
- erros internos do provedor não são exibidos diretamente;
- a exclusão exige sessão válida, senha atual e confirmação explícita.

Consulte [docs/security.md](docs/security.md) e [docs/database.md](docs/database.md).

### Nota da auditoria

O `npm audit` sinaliza `GHSA-qwww-vcr4-c8h2` no React Router. O aviso afeta somente APIs instáveis
de RSC, que não são usadas neste aplicativo SPA. Ainda não existe uma correção compatível publicada
no npm. Não execute `npm audit fix --force`.

## Limitações atuais

- o usuário ainda precisa configurar seu próprio projeto Supabase;
- entrega de e-mails usa inicialmente o serviço padrão do Supabase, adequado apenas para testes;
- avatar, bio, interesses e edição completa do perfil pertencem à Fase 4;
- mensagens e comunidades continuam simuladas;
- publicação web, Windows e Android será feita em fases posteriores.

## Próxima fase

A Fase 4 implementará perfil, avatar, bio, onboarding de interesses, privacidade e música favorita.
Ela só deve começar depois dos testes reais desta fase com duas contas.
