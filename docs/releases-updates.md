# Fase 15 — Releases e atualização automática

## Resultado

O aplicativo Windows instalado consulta o GitHub Releases depois da abertura e novamente a cada
quatro horas. Quando encontra uma versão estável mais recente:

1. o instalador é baixado em segundo plano;
2. o progresso aparece no Crypt;
3. a versão baixada é validada pelos metadados e pelo hash produzidos no mesmo build;
4. a pessoa escolhe **Reiniciar e instalar**;
5. o Electron encerra a instância atual e o NSIS aplica a atualização.

O modo `npm run desktop:dev` nunca consulta ou instala releases. A verificação real fica ativa
somente no aplicativo empacotado para impedir alterações acidentais durante o desenvolvimento.

## Publicação pelo GitHub Actions

O workflow `.github/workflows/release-windows.yml` executa:

- instalação reproduzível com `npm ci`;
- `npm run validate:desktop`;
- conferência entre a tag e a versão do `package.json`;
- criação do instalador NSIS;
- publicação do instalador, blockmap e `latest.yml` no GitHub Releases.

O token temporário `GITHUB_TOKEN` é fornecido pelo próprio GitHub Actions. Não adicione token
pessoal ao projeto, ao ZIP ou às variáveis do frontend.

### Visibilidade necessária para o atualizador

O workflow consegue criar uma Release em um repositório privado, mas o aplicativo instalado não
recebe o `GITHUB_TOKEN`. Por isso, o provedor GitHub do `electron-updater` só consegue consultar
`latest.yml` e baixar a atualização quando a Release estiver acessível publicamente.

Para a atualização automática funcionar no estado atual, torne `KakaSnowww/crypt` público antes
de publicar a `v0.2.1`. Se o código precisar continuar privado, não coloque token do GitHub dentro
do aplicativo: instale a `0.2.1` manualmente e configure depois um repositório público separado ou
outro armazenamento público apenas para os artefatos de atualização.

O build de produção também exige estes Secrets em **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`;
- `VITE_LIVEKIT_URL`.

Sem qualquer um deles, o workflow falha antes de gerar um instalador incompleto. A integração de
presença no Discord usa a variável pública `DISCORD_APPLICATION_ID`, documentada em
[discord-presence.md](discord-presence.md).

## Como publicar a versão 0.2.1

Depois de validar e enviar o código para `main`:

```powershell
cd C:\Users\Snow\Documents\Crypt
git status
git add .
git commit -m "fix: configura build de producao e presenca do Discord"
git push
git tag v0.2.1
git push origin v0.2.1
```

O envio da tag inicia o workflow. Na página **Actions**, aguarde `Publicar aplicativo Windows`.
Depois, confira a página **Releases**: ela deve conter pelo menos o instalador `.exe`, o arquivo
`.blockmap` e `latest.yml`.

## Teste real de atualização

Uma atualização só pode ser confirmada entre duas versões publicadas:

1. instale a versão `0.2.0`;
2. publique a tag `v0.2.1` com os Secrets configurados;
3. mantenha a versão `0.2.0` aberta ou abra novamente pelo atalho;
4. aguarde a verificação inicial ou acesse **Conta e segurança → Verificar agora**;
5. acompanhe o download;
6. clique em **Reiniciar e instalar**;
7. confirme que **Versão instalada** mostra `0.2.1`.

Releases em rascunho não são oferecidas pelo atualizador. O instalador e `latest.yml` precisam vir
do mesmo workflow para que o hash seja correspondente.

## Android

O Android foi sincronizado como versão `0.2.1` e `versionCode 3`. Enquanto o APK for distribuído
fora da Play Store, novas instalações serão manuais. Quando o aplicativo entrar na Play Store, a
atualização automática será controlada pela própria loja, sem conceder ao Crypt permissão para
instalar pacotes desconhecidos.

## Assinatura do Windows

O mecanismo valida a integridade da atualização, mas o instalador continua sem certificado de
assinatura de código. O SmartScreen pode mostrar **Editor desconhecido**. Um certificado comercial
poderá ser adicionado depois sem alterar a arquitetura do atualizador.
