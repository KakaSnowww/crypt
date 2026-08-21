# Perfil Grimório Pro V2

Atualização visual focada em perfil e configurações. Não altera banco de dados, autenticação, pagamentos, dependências ou contratos de API.

## O que muda

- acabamento mais editorial e profissional no perfil;
- navegação de configurações como capítulos do grimório;
- edição de identidade, avatar, banner, interesses, privacidade e música na nova linguagem;
- contas conectadas e segurança visualmente integradas;
- remoção do violeta legado nessas telas;
- responsividade para navegador, Electron e Android.

## Instalação

Crie um checkpoint antes de extrair o ZIP:

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
git status --short
git add -A
git commit -m "checkpoint antes do Perfil Grimório Pro V2"
```

Extraia o pacote na raiz do Crypt:

```powershell
Expand-Archive `
  -Path "$env:USERPROFILE\Downloads\crypt-perfil-grimorio-pro-v2.zip" `
  -DestinationPath "C:\Users\Snow\Documents\Crypt" `
  -Force
```

## Validação

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
npm ci
npm run validate
npm run desktop:check
npm run android:sync
git diff --check
```

## Reversão

Se a atualização ainda não tiver sido commitada, restaure apenas os arquivos listados no ZIP a partir do checkpoint criado. Não use `git reset --hard` se houver outros trabalhos locais.
