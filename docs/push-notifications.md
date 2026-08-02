# Fase 16 — Push no Android com o aplicativo fechado

## Resultado

A central privada da Fase 12 continua sendo a fonte dos avisos. Quando o banco cria uma nova linha
em `user_notifications`, um Database Webhook chama a Edge Function `push-notifications`. A função
confere as preferências, localiza somente os dispositivos da pessoa e envia o aviso pelo Firebase
Cloud Messaging (FCM).

No Android, o Crypt:

- registra o token FCM somente depois da permissão de notificações;
- mantém um UUID próprio por instalação e atualiza tokens renovados;
- abre diretamente a rota interna ao tocar no aviso;
- não mostra uma segunda notificação quando já está aberto;
- remove o dispositivo da conta antes do logout;
- usa `som1.mp3` em mensagens/menções e `som4.mp3` em amizades;
- respeita `Alertas do sistema`, `Som` e as categorias salvas em **Notificações → Preferências**.

Tokens FCM e histórico de entrega nunca são retornados ao frontend. A Edge Function é idempotente,
limita cada dispositivo a três tentativas por notificação e desativa tokens recusados pelo Firebase.

## 1. Criar o aplicativo no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e crie o projeto `Crypt`.
2. Na visão geral, escolha **Adicionar app → Android**.
3. Use exatamente o pacote `com.kakasnowww.crypt`.
4. Baixe `google-services.json`. Não renomeie o arquivo.
5. Abra **Configurações do projeto → Contas de serviço**.
6. Clique em **Gerar nova chave privada** e guarde o JSON baixado fora da pasta do projeto.

Os dois arquivos são diferentes. Nenhum deles deve entrar no GitHub. A configuração segue o fluxo
oficial do [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications) e do
[Firebase Admin](https://firebase.google.com/docs/admin/setup).

## 2. Aplicar banco, Firebase e Edge Function

No PowerShell, substitua apenas os dois caminhos pelos nomes realmente baixados:

```powershell
cd C:\Users\Snow\Documents\Crypt

npm ci
npm run supabase:db:push

.\scripts\configure-firebase-push.ps1 `
  -GoogleServicesJson "C:\Users\Snow\Downloads\google-services.json" `
  -ServiceAccountJson "C:\Users\Snow\Downloads\crypt-firebase-adminsdk.json"
```

O script:

1. confere o pacote e se os arquivos pertencem ao mesmo projeto Firebase;
2. copia `google-services.json` para o Android;
3. envia as credenciais para os Secrets das Edge Functions;
4. publica `push-notifications`;
5. apaga o arquivo temporário local com os segredos;
6. copia um segredo aleatório do webhook para a área de transferência.

Não cole esse segredo em conversa, issue, commit ou captura de tela.

## 3. Criar o Database Webhook

No [Supabase do Crypt](https://supabase.com/dashboard/project/dpvflnbxtchjyjhisejv), abra
**Database → Webhooks → Create a new hook** e configure:

| Campo           | Valor                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| Nome            | `push-notifications`                                                       |
| Tabela          | `public.user_notifications`                                                |
| Evento          | somente `INSERT`                                                           |
| Método          | `POST`                                                                     |
| URL             | `https://dpvflnbxtchjyjhisejv.supabase.co/functions/v1/push-notifications` |
| Header          | `x-crypt-webhook-secret`                                                   |
| Valor do header | pressione `Ctrl+V` para colar o segredo criado pelo script                 |
| Timeout         | `5000` ms                                                                  |

Salve uma única vez. O webhook é assíncrono e não atrasa o envio da mensagem no Crypt. O formato do
payload segue os [Database Webhooks do Supabase](https://supabase.com/docs/guides/database/webhooks).

## 4. Validar e gerar o APK

Confirme primeiro que `public/som1.mp3` e `public/som4.mp3` existem. O Gradle copia esses arquivos
automaticamente para os recursos nativos do APK.

```powershell
cd C:\Users\Snow\Documents\Crypt

npm run android:push:check
npm run validate:android
npm run android:open
```

No Android Studio, conecte o Redmi 10C e execute o aplicativo. A versão desta fase é `0.3.0` com
`versionCode 9`.

## 5. Teste real com duas contas

1. No celular, entre na Conta B.
2. Em **Notificações → Preferências**, mantenha a categoria desejada, **Som** e
   **Alertas do sistema** ligados.
3. Autorize as notificações no modal do Android.
4. Feche o Crypt completamente pela tela de aplicativos recentes.
5. Pela Conta A no computador, envie uma mensagem privada para B.
6. Confirme que o Android mostra o aviso sem abrir o Crypt.
7. Toque no aviso e confirme a abertura da conversa correta.
8. Repita com uma menção `@`, um pedido de amizade e um aviso de moderação.
9. Desligue **Alertas do sistema**, feche o aplicativo e confirme que o próximo evento continua na
   central, mas não produz push.
10. Saia da Conta B no Android, mande outra mensagem e confirme que esse aparelho não a recebe.

Enquanto o aplicativo está aberto, o Supabase Realtime continua responsável pelo toast e pelos
sons. O FCM fica sem apresentação em primeiro plano para não duplicar o mesmo evento.

## Diagnóstico

- **`push_not_configured`**: repita o script da etapa 2.
- **`invalid_webhook_secret`**: gere novamente com o script e atualize o header do webhook.
- **Sem token no banco**: confira a permissão do Android e abra o Crypt autenticado uma vez.
- **Aviso chega sem som**: confirme os arquivos `public/som1.mp3` e `public/som4.mp3`, reinstale o
  APK e verifique a categoria nas configurações de notificação do Android.
- **Aviso não chega fechado**: confira `google-services.json`, o webhook e os logs da função
  `push-notifications` no Dashboard do Supabase.

O arquivo de conta de serviço concede acesso administrativo ao Firebase. Se ele for exposto,
revogue a chave imediatamente no Firebase e execute a configuração novamente com uma chave nova.
