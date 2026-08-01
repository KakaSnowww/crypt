# Presença do Crypt no Discord

## Por que o Discord mostrava outro jogo

A versão `0.2.0` usava `Crypt.exe`. O Discord associava esse nome ao jogo **Crypt: The Black
Tower**. A partir da `0.2.1`, o executável interno é `CryptMessenger.exe`, enquanto o nome visível,
atalhos e instalador continuam sendo **Crypt**.

## Rich Presence própria

O processo principal do Electron se conecta apenas ao IPC local do Discord e publica:

- aplicativo: **Crypt**;
- detalhes: **Conversando no Crypt**;
- estado: **Comunidades, mensagens e chamadas**;
- tempo desde que o Crypt foi aberto.

Não existe acesso à senha, token ou mensagens do Discord. Se o Discord estiver fechado, o Crypt
continua funcionando normalmente e tenta conectar novamente depois.

## Criar o aplicativo no Discord

1. Acesse `https://discord.com/developers/applications`.
2. Clique em **New Application**.
3. Use o nome **Crypt**.
4. Em **General Information**, envie a logo do Crypt e salve.
5. Copie somente o **Application ID**. Ele é público; não copie nem compartilhe o Client Secret.
6. No repositório GitHub, abra **Settings → Secrets and variables → Actions → Variables**.
7. Crie a variável `DISCORD_APPLICATION_ID` com o Application ID copiado.

O workflow recusa IDs vazios ou inválidos. A integração aparece somente no aplicativo Windows
instalado, com o Discord Desktop aberto e a opção de compartilhar atividade habilitada no Discord.

## Desenvolvimento

O arquivo `electron/discordConfig.ts` mantém um marcador inativo no Git. Durante o GitHub Actions,
o marcador é substituído pelo `DISCORD_APPLICATION_ID` antes da compilação. Dessa forma, nenhuma
credencial é necessária no código e o build local continua funcionando sem Discord.
