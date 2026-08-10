# Crypt — Biblioteca Alquímica V1

Esta atualização altera somente a fundação visual do aplicativo:

- nova página inicial editorial;
- navegação renomeada como catálogo, acervos, correspondências e vínculos;
- paleta de carvão, pergaminho, latão e verde de reagente;
- shell mais compacto e distante da aparência do Discord;
- teste de rota atualizado para a nova interface.

Ela não altera banco de dados, Supabase, pagamentos, autenticação nem dependências.

## 1. Checkpoint antes de extrair

Abra o PowerShell na pasta do Crypt:

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
git status --short
git add -A
git commit -m "checkpoint antes da Biblioteca Alquímica V1"
```

Se o Git informar que não há nada para commitar, prossiga normalmente. Não use `git reset --hard`.

## 2. Extrair de Downloads diretamente para o Crypt

Feche o servidor de desenvolvimento antes de extrair. Depois execute:

```powershell
Expand-Archive `
  -Path "$env:USERPROFILE\Downloads\crypt-biblioteca-alquimica-v1.zip" `
  -DestinationPath "C:\Users\Snow\Documents\Crypt" `
  -Force
```

## 3. Validar e testar

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
npm ci
npm run validate
git diff --check
git status --short
```

O resultado esperado é:

- 78 arquivos de teste aprovados;
- 169 testes aprovados;
- auditorias de texto e segurança aprovadas;
- Prettier aprovado;
- build Vite concluído.

## 4. Testar visualmente

```powershell
npm run dev
```

Abra o endereço mostrado pelo Vite e verifique:

- página inicial no desktop e no celular;
- navegação entre Índice, Acervos, Cartas, Vínculos e Perfil;
- busca global;
- abertura de uma comunidade e de um canal;
- mensagens diretas;
- contraste e foco de teclado.

## 5. Reversão segura

Se ainda não tiver criado outro commit depois da extração, restaure apenas os arquivos desta atualização:

```powershell
git restore `
  src/app/router.test.tsx `
  src/components/layout/AppShell.tsx `
  src/routes/AppHomeRoute.tsx `
  src/styles/globals.css

Remove-Item ".\src\styles\library-alchemy.css" -Force
```

Confira o resultado com:

```powershell
git status --short
```

## Arquivos alterados

- `src/app/router.test.tsx`
- `src/components/layout/AppShell.tsx`
- `src/routes/AppHomeRoute.tsx`
- `src/styles/globals.css`
- `src/styles/library-alchemy.css` (novo)
