# Crypt

Plataforma social de comunidades, conversas, amizades e descoberta de pessoas por interesses. O
Crypt possui identidade visual própria em roxo e azul e está sendo construído em fases para web,
Windows e Android.

## Estado atual — Fase 5

Além do perfil e onboarding entregues na Fase 4, esta fase adiciona:

- busca exata ou parcial pelo `@`, limitada a 20 resultados;
- perfis públicos sem e-mail ou configurações internas;
- pedidos recebidos e enviados;
- aceitar, recusar e cancelar pedidos;
- amizade armazenada uma única vez em par canônico;
- lista de amigos online e offline;
- presença leve com expiração automática;
- remover amizade, bloquear e desbloquear;
- bloqueio válido nos dois sentidos para novas interações;
- aba **Descobrir** com sugestões por interesses e amigos em comum;
- pontuação transparente calculada somente no banco, sem IA;
- explicações objetivas dos interesses compartilhados;
- ignorar por 30 dias ou não sugerir novamente;
- notificações de pedido novo e pedido aceito;
- denúncia privada com motivo controlado e proteção contra repetição;
- atualização por Realtime sem depender de F5;
- preferências separadas para aparecer na busca e aceitar pedidos;
- RLS e RPCs protegidas para todas as ações sociais;
- 56 testes pgTAP da Fase 5 e testes de interface.

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

A migration da Fase 5 cria amizades, pedidos, bloqueios, sugestões, notificações, presença e todas
as funções protegidas automaticamente. Não crie tabelas ou políticas manualmente no painel.

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
- `/app/conexoes`
- `/app/pessoas/@identificador`
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
│   ├── connections/
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
- o Spotify Embed é incorporado sem baixar ou hospedar áudio;
- segredos administrativos continuam fora do bundle.
- pedidos, amizades e bloqueios só podem ser alterados pelas funções protegidas;
- uma terceira conta não lê pedidos, amizades, bloqueios ou notificações alheias;
- score de sugestão nunca é enviado pelo cliente;
- pessoas bloqueadas são removidas de pedidos, amizades, busca e sugestões;
- a barreira `can_start_direct_message` já impede futuras DMs entre bloqueados.

Consulte [docs/security.md](docs/security.md), [docs/database.md](docs/database.md) e
[docs/profile-onboarding.md](docs/profile-onboarding.md) e [docs/connections.md](docs/connections.md).

### Nota da auditoria

O `npm audit` sinaliza `GHSA-qwww-vcr4-c8h2` no React Router. O aviso afeta APIs instáveis de RSC,
que não são usadas neste aplicativo SPA. Não execute `npm audit fix --force`.

## Limitações atuais

- o envio padrão de e-mails do Supabase é apropriado apenas para testes;
- presença depende de a aplicação permanecer aberta e expira após dois minutos sem atividade;
- servidores em comum entrarão na pontuação quando as comunidades existirem;
- a análise administrativa das denúncias será conectada na fase própria;
- mensagens e comunidades continuam simuladas;
- publicação web, Windows e Android será feita em fases posteriores.

## Próxima fase

A Fase 6 implementará servidores, convites, entrada, saída, membros, propriedade, transferência e
exclusão. Ela só começa depois dos testes reais da Fase 5 com duas contas.
