# Crypt — Biblioteca Viva V4

Esta atualização substitui os ícones 2D da V3 por objetos 3D recortados e cria uma identidade visual própria em login, assinatura Arcana, servidores, navegação e conversas.

## Antes de aplicar

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
git status --short
git add -A
git commit -m "checkpoint antes da Biblioteca Viva V4"
```

## Extração direta de Downloads

```powershell
Expand-Archive `
  -Path "$env:USERPROFILE\Downloads\crypt-biblioteca-viva-v4.zip" `
  -DestinationPath "C:\Users\Snow\Documents\Crypt" `
  -Force
```

## Validação

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

O `android:push:check` exige o arquivo local `android/app/google-services.json`, que não faz parte deste ZIP.

## Homologação visual

```powershell
npm run dev
```

Confira em 1440×900 e em largura de celular:

- login: objetos 3D sem quadriculado, formulário jade/bronze e boa legibilidade;
- início: livros e poções com profundidade, sem ícones de frasco deslizando;
- servidores/acervos: tomos, estados ativos e botões sem roxo legado;
- conversas: fundos em ônix, detalhes em bronze e jade, composer e mensagens legíveis;
- Arcana: altar de assinatura, preço, benefícios e gerenciamento;
- redução de movimento: animações desativadas pelo sistema.

## APK local de teste

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt\android"
.\gradlew.bat assembleDebug
```

Saída: `android\app\build\outputs\apk\debug\app-debug.apk`.

Não crie tag de release antes da homologação visual e funcional.

## Reversão

Use o hash do checkpoint exibido por `git log --oneline -5` e reverta apenas depois de confirmar que não há trabalho posterior a preservar.
