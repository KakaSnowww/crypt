# Crypt — Perfil Grimório V1

Esta atualização transforma a tela **Meu perfil** em um grimório aberto e responsivo.

## O que muda

- perfil organizado como duas páginas de um livro;
- capa, lombada, papel, moldura de latão e marcador feitos em CSS;
- capítulos para identidade, interesses e música;
- paleta própria em pergaminho, jade, latão e ônix;
- layout adaptado para navegador, desktop e Android;
- avatar padrão sem o antigo gradiente violeta.

Não há imagens geradas, migrations, alterações no banco, Supabase, pagamentos ou credenciais.

## Antes de instalar

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
git status --short
git add -A
git commit -m "checkpoint antes do Perfil Grimório V1"
```

## Extrair de Downloads

```powershell
Expand-Archive `
  -Path "$env:USERPROFILE\Downloads\crypt-perfil-grimorio-v1.zip" `
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

## Conferir visualmente

```powershell
npm run dev
```

Abra **Perfil** e confira desktop e largura de celular. O perfil público ainda não foi redesenhado nesta V1.

## Reversão

Não use `git reset --hard`. Para desfazer com histórico preservado, localize o checkpoint e reverta as mudanças após ele com um novo commit.
