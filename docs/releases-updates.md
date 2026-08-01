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

## Como publicar a versão 0.2.0

Depois de validar e enviar o código para `main`:

```powershell
cd C:\Users\Snow\Documents\Crypt
git status
git add .
git commit -m "feat: implementa releases e atualizacao automatica"
git push
git tag v0.2.0
git push origin v0.2.0
```

O envio da tag inicia o workflow. Na página **Actions**, aguarde `Publicar aplicativo Windows`.
Depois, confira a página **Releases**: ela deve conter pelo menos o instalador `.exe`, o arquivo
`.blockmap` e `latest.yml`.

## Teste real de atualização

Uma atualização só pode ser confirmada entre duas versões publicadas:

1. publique e instale a versão `0.2.0`;
2. aumente `package.json` para `0.2.1` e mantenha Android/Tauri sincronizados;
3. publique a tag `v0.2.1`;
4. abra a versão `0.2.0` instalada;
5. aguarde a verificação inicial ou acesse **Conta e segurança → Verificar agora**;
6. acompanhe o download;
7. clique em **Reiniciar e instalar**;
8. confirme que **Versão instalada** mostra `0.2.1`.

Releases em rascunho não são oferecidas pelo atualizador. O instalador e `latest.yml` precisam vir
do mesmo workflow para que o hash seja correspondente.

## Android

O Android foi sincronizado como versão `0.2.0` e `versionCode 2`. Enquanto o APK for distribuído
fora da Play Store, novas instalações serão manuais. Quando o aplicativo entrar na Play Store, a
atualização automática será controlada pela própria loja, sem conceder ao Crypt permissão para
instalar pacotes desconhecidos.

## Assinatura do Windows

O mecanismo valida a integridade da atualização, mas o instalador continua sem certificado de
assinatura de código. O SmartScreen pode mostrar **Editor desconhecido**. Um certificado comercial
poderá ser adicionado depois sem alterar a arquitetura do atualizador.
