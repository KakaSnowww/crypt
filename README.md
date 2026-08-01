# Crypt

Plataforma social de comunidades, conversas, amizades e descoberta de pessoas por interesses, com
identidade visual em roxo e azul.

## Estado atual — Fase 14.3–14.4

As Fases 14.3 e 14.4 foram unificadas e entregam chamadas e transmissão nativa no Android:

- chamada mantida em segundo plano por serviço com notificação persistente;
- retorno à chamada ao tocar na notificação;
- rotas para auricular, alto-falante, fone com fio e Bluetooth;
- câmera frontal/traseira sem sair da sala;
- navegação e minimização sem desconectar;
- compartilhamento por `MediaProjection`, sem seletor do navegador;
- publicação 720p/1080p pelo SDK Android do LiveKit;
- participante auxiliar oculto da contagem, presença e sons;
- encerramento sincronizado pelo Crypt ou pelo sistema Android.

A Fase 14.2 integra recursos próprios do celular:

- alertas Android pela central nativa de notificações;
- permissão de notificações solicitada somente por ação explícita;
- canal `Alertas do Crypt` com ícone monocromático, luz e vibração;
- abertura segura do conteúdo ao tocar no alerta;
- seletor nativo para compartilhar convites com outros aplicativos;
- links `crypt://invite/{código}` entre Android e Windows;
- feedback tátil discreto depois do compartilhamento;
- detecção nativa de Wi-Fi, dados móveis e perda de conexão;
- aviso offline e reconexão automática do TanStack Query;
- presença online/ausente sincronizada com o primeiro e segundo plano do Android.

A Fase 14.1 adiciona a base Android:

- Capacitor 8 com projeto nativo versionado em `android/`;
- identificador `com.kakasnowww.crypt`;
- Android 7/API 24 como mínimo e API 36 como alvo;
- mesma interface, autenticação, Supabase e Realtime do Windows;
- retorno de autenticação por `crypt://auth/callback`;
- botão físico voltar integrado ao histórico;
- minimização segura quando não existe histórico;
- barra de status escura, splash e ícones do Crypt;
- área segura e teclado preparados para telas pequenas;
- permissões mínimas de câmera e microfone declaradas;
- scripts para sincronizar, abrir, executar e gerar APK de teste.

A Fase 15 prepara distribuição e atualização:

- versão pública corretiva `0.2.1`, com configuração segura do build de produção;
- experiência `0.2.3` com botão no cabeçalho, `som5.mp3`, nova tentativa segura de áudio e popup de novidades;
- executável exclusivo e Rich Presence própria para impedir associação a outro jogo no Discord;
- publicação automatizada do instalador NSIS pelo GitHub Actions;
- verificação obrigatória do instalador, blockmap e `latest.yml` na Release;
- metadados `latest.yml` e validação de integridade;
- verificação no início e a cada quatro horas;
- download em segundo plano com progresso visível;
- instalação somente depois de confirmar a reinicialização;
- atualização desativada de forma segura no modo de desenvolvimento.

A Fase 13.3 estabilizou o aplicativo Windows em Electron:

- seletor próprio de monitor ou janela;
- miniaturas e atualização das fontes disponíveis;
- captura direta do Chromium entregue ao LiveKit como `MediaStreamTrack`;
- perfis Equilibrado em 720p/30 FPS e Alta qualidade em 1080p/30 FPS;
- áudio do sistema opcional via loopback no Windows;
- nenhuma conversão para JPEG, base64, IPC de quadros ou canvas;
- sem o seletor padrão do navegador;
- transmissão persistente ao navegar dentro do Crypt;
- chamada preservada ao fechar a janela para a bandeja;
- menu da bandeja para abrir ou encerrar completamente o Crypt;
- tamanho, posição e maximização da janela preservados;
- encerramento seguro ao sair ou trocar de chamada;
- shell isolado com `contextIsolation`, sandbox e API mínima no preload;
- instância única, deep link `crypt://` e instalador NSIS.

A Fase 12 adiciona:

- central privada e unificada de notificações;
- amizade, mensagens privadas, menções e moderação;
- contador de não lidas e atualização em tempo real;
- preferências individuais por categoria;
- avisos internos, som e alertas do sistema;
- base compatível com navegador, Windows e Android;
- Service Worker preparado para publicação e push em segundo plano;
- RLS, RPCs protegidas e testes de isolamento;

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
- Electron 42 para o aplicativo Windows
- Capacitor 8 e projeto Gradle para o aplicativo Android
- Vitest, Testing Library, pgTAP, ESLint e Prettier

## Requisitos

- Node.js 24
- npm 11
- Git
- conta gratuita no Supabase
- Windows 10 ou 11 para executar e empacotar o aplicativo Electron
- Android Studio 2025.2.1 ou mais novo e SDK 36 para executar o aplicativo Android
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
8. `20260728010000_phase11_voice_presence.sql`;
9. `20260728180000_phase12_notifications.sql`;
10. `20260728230000_phase125_profile_visuals.sql`.

Elas criam tabelas, funções, índices, buckets, policies, publicação Realtime e a movimentação segura
da hierarquia de cargos. Não crie esses recursos manualmente no painel.

## Publicar a Edge Function

A versão nova de `delete-account` também limpa anexos de mensagens:

```powershell
npx supabase secrets set "ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,crypt-app://app,https://crypt.local"
npm run supabase:functions:deploy
```

## Executar

```powershell
npm run dev
```

Aplicativo Windows:

```powershell
npm run desktop:dev
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
- `/app/notificacoes`
- `/app/pessoas/@identificador`
- `/app/perfil`, `/app/perfil/editar`, `/app/conta`

## Validação

```powershell
npm run validate
```

No aplicativo instalado, o Android solicita microfone, câmera, notificações e Bluetooth depois de
explicar o uso de cada recurso. No desktop, o layout ocupa a janela sem rolar a aplicação inteira:
em canais e mensagens privadas, somente o histórico central se movimenta; cabeçalho, canais,
painel de call, membros e caixa de envio permanecem estáticos.

O shell do aplicativo é fixado diretamente ao viewport do Electron. As telas comuns rolam apenas
dentro da área central; nos chats, essa rolagem externa é desativada e o histórico recebe seu
próprio contêiner, impedindo que perfil, call, canais ou membros acompanhem as mensagens.

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
│   ├── notifications/
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
- [docs/notifications.md](docs/notifications.md)
- [docs/profile-visuals-sounds.md](docs/profile-visuals-sounds.md)
- [docs/windows-electron.md](docs/windows-electron.md)
- [docs/android.md](docs/android.md)
- [docs/android-mobile-resources.md](docs/android-mobile-resources.md)
- [docs/releases-updates.md](docs/releases-updates.md)

### Nota da auditoria

O `npm audit` pode sinalizar `GHSA-qwww-vcr4-c8h2` no React Router. O aviso afeta APIs instáveis de
RSC, que não são usadas neste aplicativo SPA. Não execute `npm audit fix --force`.

## Limitações atuais

- o envio padrão de e-mails do Supabase é apropriado apenas para testes;
- alertas do sistema em segundo plano exigem publicação HTTPS e serão ativados com a PWA;
- busca global no histórico ainda não foi adicionada;
- a base Android, chamadas, câmera e transmissão nativa já estão prontas;
- notificações push com o aplicativo totalmente encerrado entram na próxima fase;
- distribuição Android pela Play Store ainda depende da conta de publicação;
- o instalador inicial do Windows não possui assinatura de código.

## Aplicativo Windows

A Fase 13.3 usa Electron 42, identidade visual, bandeja, instância única, notificações, protocolo
`crypt://` e instalador NSIS `.exe`. O compartilhamento selecionado no Crypt é entregue diretamente
pelo Chromium ao LiveKit, sem recompressão intermediária. Execute `npm run desktop:build` no Windows
para gerar o instalador.
