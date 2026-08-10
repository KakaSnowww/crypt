# Crypt — Biblioteca Alquímica V2

Atualização visual compartilhada pelo site, Electron/Windows e Capacitor/Android.

## O que muda

- Login e cadastro com cenário surreal de biblioteca impossível.
- Home cinematográfica com livros, arquitetura arcana e luz alquímica.
- Paleta sem o violeta legado: obsidiana, latão, pergaminho e verde de reagente.
- Servidores apresentados como bibliotecas e acervos.
- Barra de status Android alinhada à nova identidade.
- Testes atualizados para a nova linguagem visual.

Não há migration, alteração de banco, secret ou credencial neste pacote.

## 1. Checkpoint antes de extrair

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
git status --short
git add -A
git commit -m "checkpoint antes da Biblioteca Alquímica V2"
```

## 2. Extrair diretamente de Downloads

```powershell
Expand-Archive `
  -Path "$env:USERPROFILE\Downloads\crypt-biblioteca-alquimica-v2.zip" `
  -DestinationPath "C:\Users\Snow\Documents\Crypt" `
  -Force
```

## 3. Validar código, web e desktop

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
npm ci
npm run validate
npm run desktop:check
git diff --check
git status --short
```

## 4. Validar Android

O arquivo `android/app/google-services.json` deve continuar sendo apenas local e nunca versionado.

```powershell
npm run android:push:check
npm run android:sync
Set-Location ".\android"
.\gradlew.bat assembleDebug
Set-Location ".."
```

O APK de teste será criado em:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

## 5. Teste visual

```powershell
npm run dev
```

Confira login, cadastro, home, acervos/servidores, canais, mensagens, perfis, modais e atualização. Teste também em largura de celular.

## 6. Publicação por tag — somente depois de tudo aprovado

O repositório já possui o fluxo encadeado: Windows primeiro; APK/AAB Android em seguida. Antes de criar a tag, a versão do projeto precisa ser incrementada e os metadados da nova release precisam passar em `npm run release:verify`.

Não reutilize `v0.10.0` se ela já existe no GitHub. A tag da próxima versão será definida após a homologação desta atualização.

## Reversão

Se ainda não houver commit da V2:

```powershell
git restore --source=HEAD --worktree -- `
  src/components/layout/AuthLayout.tsx `
  src/routes/AppHomeRoute.tsx `
  src/routes/ServersRoute.tsx `
  src/app/router.test.tsx `
  src/routes/ServersRoute.test.tsx `
  src/lib/androidRuntime.ts `
  src/styles/globals.css `
  src/styles/library-alchemy.css
Remove-Item ".\public\art\alchemical-library-surreal.png"
```

