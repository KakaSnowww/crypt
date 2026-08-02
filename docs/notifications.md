# Fase 12 — Notificações

## O que foi implementado

- central privada em `/app/notificacoes`;
- contador de itens não lidos no sino e na navegação;
- atualização em tempo real pelo Supabase Realtime;
- eventos de amizade, mensagens privadas, menções e denúncias administrativas;
- leitura individual e ação para marcar tudo como lido;
- preferências por categoria, som, avisos internos e alertas do sistema;
- Service Worker mínimo para exibir e abrir alertas no Windows, Android e navegador;
- RLS, RPCs protegidas, deduplicação e testes pgTAP.

## Alertas do sistema

O navegador exige autorização explícita da pessoa. Em `localhost`, a permissão pode ser testada
normalmente. Fora do computador local, o site precisa estar publicado com HTTPS.

No Android, a Fase 14.2 usa a central nativa de notificações. A autorização do Android 13 ou mais
novo só é solicitada quando a pessoa toca em **Permitir no dispositivo**. O canal
`Alertas do Crypt` possui ícone próprio e abre diretamente o conteúdo relacionado.

O Crypt apresenta o alerta do sistema enquanto a aplicação está em execução. No Android, a Fase 16
usa Firebase Cloud Messaging e uma função de entrega autenticada para avisar mesmo com o aplicativo
completamente encerrado. Ela reutiliza as preferências e os eventos já criados. No navegador, push
totalmente fechado continua dependente de publicação HTTPS/PWA.

## Eventos

| Tipo                | Destinatário                   | Origem               |
| ------------------- | ------------------------------ | -------------------- |
| `friend_request`    | pessoa que recebeu o pedido    | conexões             |
| `friend_accepted`   | pessoa que enviou o pedido     | conexões             |
| `direct_message`    | outro participante da conversa | mensagens privadas   |
| `channel_mention`   | pessoa mencionada              | mensagem de canal    |
| `moderation_report` | dono e moderadores autorizados | denúncia de servidor |

## Segurança

- o cliente não insere nem altera o conteúdo das notificações;
- as rotinas internas são executadas no banco;
- cada pessoa consulta apenas as próprias linhas;
- a marcação de leitura valida novamente o destinatário;
- preferências pertencem exclusivamente ao perfil autenticado;
- caminhos abertos pelos alertas são limitados a rotas internas `/app`.

## Teste manual

1. Entre com duas contas no mesmo projeto.
2. Na conta B, abra **Notificações → Preferências** e permita alertas do sistema.
3. Envie uma mensagem privada da conta A para a conta B.
4. Confirme o alerta interno, o alerta do dispositivo e o contador.
5. Em um canal, digite `@` e parte do nome ou identificador da conta B.
6. Selecione a pessoa com o mouse, `Enter` ou `Tab` e envie a mensagem.
7. Abra a notificação e confirme a navegação para o conteúdo.
8. Desative uma categoria, salve e confirme que novos eventos dela deixam de ser gerados.

No Android, faça também:

1. confirme que o pedido de permissão aparece somente depois de tocar no botão;
2. envie uma DM ou menção pela segunda conta;
3. confirme o alerta na central do Android;
4. toque no alerta e confirme a abertura da conversa correta;
5. desligue Wi-Fi e dados móveis e confirme o aviso offline;
6. religue a conexão e confirme a atualização automática.
