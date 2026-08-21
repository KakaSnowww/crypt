# Crypt — Biblioteca Alquímica V3

Atualização visual compartilhada pelo site, Electron e Android. Não altera banco, Supabase, pagamentos, migrations ou credenciais.

## Antes de instalar

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
git status --short
git add -A
git commit -m "checkpoint antes da Biblioteca Alquímica V3"
```

## Extrair de Downloads diretamente no Crypt

```powershell
Expand-Archive `
  -Path "$env:USERPROFILE\Downloads\crypt-biblioteca-alquimica-v3.zip" `
  -DestinationPath "C:\Users\Snow\Documents\Crypt" `
  -Force
```

## Validar

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
npm ci
npm run validate
npm run desktop:check
npm run android:push:check
npm run android:sync
git diff --check
git status --short
```

`android:push:check` exige seu `android/app/google-services.json` local. Esse segredo não está no ZIP.

## Ver no navegador e no desktop

```powershell
npm run dev
```

Em outro PowerShell:

```powershell
npm run desktop:dev
```

## Gerar APK de teste

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt\android"
.\gradlew.bat assembleDebug
```

Saída: `android\app\build\outputs\apk\debug\app-debug.apk`.

## Reverter

Antes de reverter, confira `git status --short`. Para voltar ao checkpoint, use o hash exibido por `git log --oneline -5` e faça a reversão por um novo commit; não apague alterações locais sem revisá-las.

## Checklist visual

- Login: cenário monumental, poções, livros flutuantes e formulário legível.
- Home: animações em camadas e boa leitura em telas pequenas.
- Acervos: servidores com aparência de tomos físicos.
- Shell: nenhum efeito bloqueia cliques, rolagem ou menus.
- Acessibilidade: com “reduzir movimento” ativo, os elementos permanecem estáticos.
