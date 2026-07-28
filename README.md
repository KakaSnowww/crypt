# Crypt

Plataforma social de comunidades, conversas, amizades e descoberta de pessoas por interesses, com
identidade visual em roxo e azul.

## Estado atual — Fase 11

Além das fases anteriores, a Fase 11 adiciona:

- canais de voz e vídeo;
- áudio, câmera e compartilhamento de tela com LiveKit;
- seleção de dispositivos e reconexão;
- presença consultada diretamente no LiveKit, inclusive para quem ainda não entrou;
- modo de áudio natural e enquadramento de câmera inteiro ou preenchido;
- Edge Function protegida para tokens temporários;
- validação de associação e permissões antes de entrar na sala;

A Fase 10 adicionou:

- expulsões e banimentos protegidos por hierarquia;
- remoção de ban sem restaurar associação automaticamente;
- denúncias internas privadas;
- caixa de moderação;
- auditoria administrativa imutável para o cliente;
- preferências de moderação do servidor;

A Fase 9 adicionou:

- mensagens privadas individuais;
- abertura pelo perfil e lista de conversas recentes;
- privacidade para qualquer pessoa, amigos, servidor compartilhado ou ninguém;
- bloqueios aplicados no banco;
- histórico paginado, resposta, edição, exclusão e reações;
- anexos privados com URL assinada;
- não lidas, leitura, digitação e Realtime;
- fechar conversa sem apagar o histórico;
- isolamento por RLS contra uma terceira conta;
- estrutura preparada para grupos futuros, sem habilitá-los nesta fase.

As Fases 7–8 já oferecem:

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
- 62 verificações pgTAP das Fases 7–8, 44 da Fase 9, 42 da Fase 10, 26 da Fase
  11 e 56 testes de interface e domínio.

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
3. `20260726210000_phase78_role_hierarchy_order.sql`;
4. `20260726230000_phase9_direct_messages.sql`;
5. `20260726233000_phase9_direct_attachments_rls_fix.sql`;
6. `20260727010000_phase10_moderation_settings.sql`;
7. `20260727030000_phase11_voice_video.sql`;
8. `20260728010000_phase11_voice_presence.sql`.

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
- `/app/mensagens`
- `/app/mensagens/{uuid-da-conversa}`
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
- bloqueios impedem mensagens, reações e anexos em DMs;
- segredos administrativos ficam somente na Edge Function.

Consulte:

- [docs/security.md](docs/security.md)
- [docs/database.md](docs/database.md)
- [docs/profile-onboarding.md](docs/profile-onboarding.md)
- [docs/connections.md](docs/connections.md)
- [docs/servers-members.md](docs/servers-members.md)
- [docs/channels-messages.md](docs/channels-messages.md)
- [docs/direct-messages.md](docs/direct-messages.md)

### Nota da auditoria

O `npm audit` pode sinalizar `GHSA-qwww-vcr4-c8h2` no React Router. O aviso afeta APIs instáveis de
RSC, que não são usadas neste aplicativo SPA. Não execute `npm audit fix --force`.

## Limitações atuais

- o envio padrão de e-mails do Supabase é apropriado apenas para testes;
- presença depende de a aplicação permanecer aberta;
- busca global no histórico ainda não foi adicionada;
- moderação completa, publicação web, Windows e Android ficam para fases posteriores.

## Próxima fase

A Fase 12 implementará notificações internas, web, Windows e Android.
