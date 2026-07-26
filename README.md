# Crypt

Plataforma social de comunidades, conversas, amizades e descoberta de pessoas por interesses. O
Crypt possui identidade visual própria em roxo e azul e está sendo construído em fases para web,
Windows e Android.

## Estado atual — Fase 6

Além de perfil, onboarding e conexões entregues nas fases anteriores, esta fase adiciona:

- criação de servidores privados;
- proprietário e lista real de membros online ou offline;
- cargo de sistema `@everyone` criado automaticamente;
- canal inicial **Conversa Geral** com UUID permanente;
- entrada somente por convite validado no backend;
- convites aleatórios com validade, limite de usos e revogação;
- aceitar link completo ou somente o código do convite;
- saída segura de membros;
- proteção que impede o proprietário de sair sem transferir ou excluir;
- configurações de nome, descrição, ícone e banner;
- mídias armazenadas na pasta UUID do servidor;
- transferência de propriedade somente para outro membro;
- exclusão permanente com confirmação explícita pelo nome;
- Realtime para servidores, membros e convites;
- RLS sem escrita direta nas tabelas;
- 83 testes pgTAP da Fase 6 e 41 testes de interface e domínio.

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

A migration da Fase 6 cria servidores, membros, cargo padrão, canal inicial, convites, reserva de
banimentos, bucket de mídia e todas as funções protegidas automaticamente. Não crie tabelas ou
políticas manualmente no painel.

A migration corretiva `20260726033000_phase6_server_media_rls_fix.sql` autoriza ícones e banners
somente para o proprietário sem depender da leitura recursiva de `servers` dentro da policy do
Storage.

## Edge Function da conta

A função de exclusão limpa as mídias do perfil e dos servidores pertencentes à conta. Publique a
nova versão depois de aplicar a migration:

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
- `/app/servidores`
- `/app/servidores/{uuid}`
- `/app/servidores/{uuid}/configuracoes`
- `/app/convite/{codigo}`
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
│   ├── profile/
│   └── servers/
│       ├── components/
│       ├── servers.errors.ts
│       ├── servers.queries.ts
│       ├── servers.schemas.ts
│       ├── servers.service.ts
│       └── servers.types.ts
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
- servidor privado só pode ser lido por membros;
- entrada exige convite existente, ativo, não expirado e com uso disponível;
- cliente não insere membros, servidores ou convites diretamente;
- transferência e exclusão verificam o proprietário dentro do banco;
- ícone e banner só podem ser enviados pelo proprietário para a pasta UUID do servidor.

Consulte [docs/security.md](docs/security.md), [docs/database.md](docs/database.md) e
[docs/profile-onboarding.md](docs/profile-onboarding.md), [docs/connections.md](docs/connections.md)
e [docs/servers-members.md](docs/servers-members.md).

### Nota da auditoria

O `npm audit` sinaliza `GHSA-qwww-vcr4-c8h2` no React Router. O aviso afeta APIs instáveis de RSC,
que não são usadas neste aplicativo SPA. Não execute `npm audit fix --force`.

## Limitações atuais

- o envio padrão de e-mails do Supabase é apropriado apenas para testes;
- presença depende de a aplicação permanecer aberta e expira após dois minutos sem atividade;
- sugestões ainda usam interesses e amigos em comum; o peso de servidores em comum será conectado
  junto da estrutura completa de canais e permissões;
- a análise administrativa das denúncias será conectada na fase própria;
- mensagens continuam simuladas;
- categorias, novos canais, cargos personalizados e permissões entram na Fase 7;
- publicação web, Windows e Android será feita em fases posteriores.

## Próxima fase

A Fase 7 implementará categorias, canais de texto com nomes livres, ordenação, cargos, permissões e
sobrescritas de acesso. Ela só começa depois dos testes reais da Fase 6 com duas contas.
