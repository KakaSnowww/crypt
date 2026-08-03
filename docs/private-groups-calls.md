# Fase 18 — grupos privados e chamadas

Esta fase habilita grupos privados de 3 a 10 pessoas usando a estrutura de mensagens já existente.
Conversas individuais continuam funcionando sem mudança de rota ou perda de histórico.

## Entregas

- criação de grupo com nome, imagem opcional e de 2 a 9 amigos;
- lista unificada de conversas individuais e grupos;
- administração de nome, imagem e participantes;
- transferência obrigatória da administração antes de o proprietário sair;
- histórico, anexos privados, respostas, edição, exclusão, reações e digitação;
- chamadas individuais e em grupo pelo LiveKit;
- atualização de grupos, membros e mensagens por Realtime;
- notificações internas e push para entrada no grupo e novas mensagens;
- RLS, RPCs protegidas, bucket privado e teste pgTAP de isolamento.

## Publicar o banco e a função

No PowerShell, dentro do projeto:

```powershell
cd C:\Users\Snow\Documents\Crypt
npm run supabase:db:push
npm run supabase:functions:deploy
```

A migration esperada é `20260802180000_phase18_private_groups_calls.sql`. O segundo comando atualiza
`livekit-token` para aceitar tanto canais de servidor quanto conversas privadas.

## Validar o código

```powershell
npm ci
npm run validate
npm run validate:desktop
npm run validate:android
```

Para executar os testes de banco localmente, mantenha o Docker Desktop aberto e use os comandos de
teste Supabase já documentados no projeto. O arquivo específico desta fase é
`supabase/tests/database/private_groups_calls_rls.test.sql`.

## Roteiro manual com três contas

1. Na conta A, tenha as contas B e C como amigas.
2. Abra **Mensagens**, selecione **Novo grupo**, escolha B e C, informe um nome e uma imagem.
3. Confirme nas outras janelas que o grupo aparece sem atualizar a página.
4. Troque mensagens, anexo, resposta e reação entre as três contas.
5. Inicie uma chamada no cabeçalho do grupo e confirme áudio, câmera e permanência ao navegar.
6. Na conta A, altere nome e imagem, remova e adicione novamente um participante.
7. Transfira a administração para B e confirme que A consegue sair depois da transferência.
8. Com uma quarta conta fora do grupo, tente abrir a URL da conversa: o histórico e a chamada devem
   permanecer indisponíveis.

## Regras de segurança

- somente participantes consultam o grupo, mensagens, membros, imagem e chamada;
- somente o administrador altera o grupo e seus participantes;
- a criação e adição aceitam apenas amigos sem bloqueio ativo;
- o grupo mantém exatamente um administrador;
- imagens ficam no bucket privado `direct-group-media` e usam URLs temporárias;
- a Edge Function valida a participação no banco antes de emitir o token LiveKit;
- nenhuma chave privada é enviada para React, Electron ou Android.
