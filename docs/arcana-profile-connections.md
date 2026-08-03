# Fase 23 — Arcana, perfil avançado e conexões externas

Versão 0.9.0: editor de avatar/banner com arraste e zoom, Arcana com doze níveis, três Runas de Comunidade, gradientes, GIF, anexos de 25 MB, transmissão Windows 1080p/60 FPS, perfis compactos, Spotify/Steam/YouTube e inicialização com o Windows.

## Conexões implementadas

- **Spotify:** OAuth 2.0 Authorization Code com PKCE, identidade pública e música atual.
- **YouTube:** OAuth 2.0 Authorization Code com PKCE, canal, avatar e estatísticas públicas.
- **Steam:** OpenID oficial, perfil, avatar, jogo atual e jogos públicos mais usados.
- **Windows e Android:** o provedor abre no navegador e retorna ao Crypt por `crypt://connections/callback`.
- **Privacidade:** cada pessoa escolhe se a conta e a atividade do Spotify aparecem no perfil.

## Segurança

A Edge Function `external-oauth` é pública apenas para receber os callbacks dos provedores. As ações iniciadas pelo aplicativo validam manualmente a sessão Supabase e a chave pública do projeto.

Os tokens OAuth:

- nunca são enviados ao cliente;
- ficam em `external_connection_credentials`, sem políticas ou permissões para `anon` e `authenticated`;
- são cifrados com AES-256-GCM e associados ao perfil/provedor;
- são removidos quando a conexão é desconectada.

Os estados OAuth são de uso único, armazenados somente por hash, expiram em dez minutos e usam PKCE no Spotify e Google.

## Secrets obrigatórios

```text
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
STEAM_WEB_API_KEY
EXTERNAL_CONNECTIONS_ENCRYPTION_KEY
```

Não coloque esses valores em `.env`, no frontend ou no Git.

## Redirect URIs

```text
https://dpvflnbxtchjyjhisejv.supabase.co/functions/v1/external-oauth/callback/spotify
https://dpvflnbxtchjyjhisejv.supabase.co/functions/v1/external-oauth/callback/youtube
```

A Steam usa o mesmo domínio por OpenID e não recebe Client Secret.

## Aplicação

Execute dentro de `C:\Users\Snow\Documents\Crypt`:

```powershell
npm ci
npx supabase secrets list --project-ref dpvflnbxtchjyjhisejv
npm run supabase:db:push
npm run supabase:functions:deploy
npm run validate:desktop
npm run validate:android
```

## Teste manual

1. Entre em **Conta e segurança → Contas conectadas**.
2. Conecte Spotify, YouTube e Steam separadamente.
3. Confirme que o navegador volta para o Crypt e mostra a conta conectada.
4. Ative ou desative **Mostrar no perfil**.
5. No Spotify, ative **Mostrar atividade**, reproduza uma música e aguarde até um minuto.
6. Abra seu perfil por outra conta e confirme que apenas os dados autorizados aparecem.
7. Desconecte cada provedor e confirme que identidade, atividade e tokens deixam de existir.

O cliente não ativa assinaturas. `arcana_subscriptions` continua sendo escrita somente por um backend de cobrança futuro.
