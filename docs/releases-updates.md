# Fase 15 — Releases e atualização automática

## Resultado

O aplicativo Windows instalado consulta o GitHub Releases depois da abertura e novamente a cada
quatro horas. Quando encontra uma versão estável mais recente:

1. o instalador é baixado em segundo plano;
2. o `som5.mp3` avisa uma vez e o progresso aparece no cabeçalho do Crypt;
3. a versão baixada é validada pelos metadados e pelo hash produzidos no mesmo build;
4. a pessoa escolhe **Reiniciar e instalar**;
5. o Electron encerra a instância atual e o NSIS aplica a atualização.
6. na primeira abertura da nova versão, um popup resume as mudanças.

O modo `npm run desktop:dev` nunca consulta ou instala releases. A verificação real fica ativa
somente no aplicativo empacotado para impedir alterações acidentais durante o desenvolvimento.

## Publicação pelo GitHub Actions

O workflow `.github/workflows/release-windows.yml` executa:

- instalação reproduzível com `npm ci`;
- conferência de `public/som1.mp3` até `public/som5.mp3`;
- `npm run validate:desktop`;
- conferência entre a tag e a versão do `package.json`;
- criação do instalador NSIS;
- publicação explícita do instalador, blockmap e `latest.yml` com o GitHub CLI;
- verificação dos três arquivos antes de concluir o workflow.

O token temporário `GITHUB_TOKEN` é fornecido pelo próprio GitHub Actions. Não adicione token
pessoal ao projeto, ao ZIP ou às variáveis do frontend.

### Visibilidade do atualizador

O workflow consegue criar uma Release em um repositório privado, mas o aplicativo instalado não
recebe o `GITHUB_TOKEN`. Por isso, o provedor GitHub do `electron-updater` só consegue consultar
`latest.yml` e baixar a atualização quando a Release estiver acessível publicamente.

O repositório `KakaSnowww/crypt` é público e permite que o aplicativo consulte e baixe Releases sem
embutir um token do GitHub no instalador.

O build de produção também exige estes Secrets em **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`;
- `VITE_LIVEKIT_URL`.

Sem qualquer um deles, o workflow falha antes de gerar um instalador incompleto. A integração de
presença no Discord usa a variável pública `DISCORD_APPLICATION_ID`, documentada em
[discord-presence.md](discord-presence.md).

## Como publicar a versão 0.2.6

Depois de validar e enviar o código para `main`:

```powershell
cd C:\Users\Snow\Documents\Crypt
git status
git add .
git commit -m "feat: melhora experiencia de atualizacao do aplicativo"
git push
git tag v0.2.6
git push origin v0.2.6
```

Antes do commit, confirme com `Get-ChildItem .\public\som*.mp3` que os cinco sons estão presentes.
O workflow interrompe a publicação se qualquer um deles estiver ausente.

Antes de criar a tag, abra **Conta e segurança** no aplicativo Electron e clique em
**Testar som de atualização**. Publique somente depois de ouvir o `som5.mp3`.

O envio da tag inicia o workflow. Na página **Actions**, aguarde `Publicar aplicativo Windows`.
Depois, confira a página **Releases**: ela deve conter pelo menos o instalador `.exe`, o arquivo
`.blockmap` e `latest.yml`.

## Teste real de atualização

Uma atualização só pode ser confirmada entre duas versões publicadas:

1. mantenha a versão `0.2.5` instalada;
2. publique a tag `v0.2.6` com os Secrets configurados;
3. abra novamente a versão `0.2.5` pelo atalho;
4. aguarde a verificação inicial ou acesse **Conta e segurança → Verificar agora**;
5. confirme que o `som5.mp3` toca e que o botão aparece no cabeçalho;
6. acompanhe o download;
7. clique em **Reiniciar e instalar**;
8. confirme que **Versão instalada** mostra `0.2.6`, que o som toca apenas na primeira abertura do processo e que o popup aparece.

Releases em rascunho não são oferecidas pelo atualizador. O instalador e `latest.yml` precisam vir
do mesmo workflow para que o hash seja correspondente.

## Android

O Android foi sincronizado como versão `0.2.6` e `versionCode 8`. Enquanto o APK for distribuído
fora da Play Store, novas instalações serão manuais. Quando o aplicativo entrar na Play Store, a
atualização automática será controlada pela própria loja, sem conceder ao Crypt permissão para
instalar pacotes desconhecidos.

## Assinatura do Windows

O mecanismo valida a integridade da atualização, mas o instalador continua sem certificado de
assinatura de código. O SmartScreen pode mostrar **Editor desconhecido**. Um certificado comercial
poderá ser adicionado depois sem alterar a arquitetura do atualizador.
