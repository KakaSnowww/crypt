$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
$version = '0.10.0'
$tag = "v$version"

Set-Location $project

function Stop-Release(
  [string]$Message
) {
  Write-Host ''
  Write-Host $Message -ForegroundColor Red
  Write-Host ''
  Read-Host 'Pressione Enter para fechar'
  exit 1
}

function Require-Command(
  [string]$Name,
  [string]$Message
) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Stop-Release $Message
  }
}

Require-Command `
  'git' `
  'Git não foi encontrado.'
Require-Command `
  'gh' `
  'GitHub CLI não foi encontrado. Instale ou atualize o gh.'
Require-Command `
  'node' `
  'Node.js não foi encontrado.'
Require-Command `
  'npm' `
  'npm não foi encontrado.'

$branch = (& git branch --show-current).Trim()

if ($branch -ne 'main') {
  Stop-Release "A publicação deve ser feita na branch main. Branch atual: $branch"
}

$origin = (& git remote get-url origin).Trim()

if (
  $origin -notmatch
  'KakaSnowww[\/:]crypt(?:\.git)?$'
) {
  Stop-Release "O remote origin não aponta para KakaSnowww/crypt: $origin"
}

& gh auth status *> $null

if ($LASTEXITCODE -ne 0) {
  Stop-Release 'Faça login no GitHub CLI com: gh auth login'
}

npm run release:verify

if ($LASTEXITCODE -ne 0) {
  Stop-Release 'A verificação da release falhou.'
}

$requiredSecrets = @(
  'ANDROID_GOOGLE_SERVICES_JSON_BASE64',
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
  'VITE_LIVEKIT_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_URL'
)

$secretNames = @(
  gh secret list `
    --repo KakaSnowww/crypt `
    --json name `
    --jq '.[].name'
)

foreach ($secret in $requiredSecrets) {
  if ($secretNames -notcontains $secret) {
    Stop-Release "Secret ausente no GitHub Actions: $secret"
  }
}

$variableNames = @(
  gh variable list `
    --repo KakaSnowww/crypt `
    --json name `
    --jq '.[].name'
)

if ($variableNames -notcontains 'DISCORD_APPLICATION_ID') {
  Stop-Release 'Variable ausente no GitHub Actions: DISCORD_APPLICATION_ID'
}

$forbiddenTracked = @(
  git ls-files
) | Where-Object {
  $_ -match '(^|/)\.env($|\.)' -or
  $_ -match 'google-services\.json$' -or
  $_ -match '\.(jks|keystore)$'
}

if ($forbiddenTracked.Count -gt 0) {
  Stop-Release (
    'Arquivos sensíveis estão rastreados pelo Git: ' +
    ($forbiddenTracked -join ', ')
  )
}

if (
  (& git tag --list $tag).Trim()
) {
  Stop-Release "A tag local $tag já existe."
}

$remoteTag = (
  & git ls-remote --tags origin "refs/tags/$tag"
).Trim()

if ($remoteTag) {
  Stop-Release "A tag remota $tag já existe."
}

Write-Host ''
Write-Host 'CRYPT — PUBLICAÇÃO OFICIAL' -ForegroundColor Magenta
Write-Host ''
Write-Host "Versão: $version"
Write-Host "Branch: $branch"
Write-Host "Remote: $origin"
Write-Host ''
Write-Host 'Esta ação irá:' -ForegroundColor Yellow
Write-Host '  1. executar validações completas;'
Write-Host '  2. adicionar as alterações ao Git;'
Write-Host '  3. criar um commit da release;'
Write-Host "  4. criar a tag $tag;"
Write-Host '  5. enviar main e a tag ao GitHub;'
Write-Host '  6. iniciar builds oficiais Windows e Android.'
Write-Host ''
Write-Host 'Use este script somente após o bloco de validação final.' -ForegroundColor Yellow
Write-Host ''

$confirmation = Read-Host "Digite PUBLICAR $version para continuar"

if ($confirmation -cne "PUBLICAR $version") {
  Stop-Release 'Publicação cancelada sem alterar o repositório.'
}

npm run validate:desktop

if ($LASTEXITCODE -ne 0) {
  Stop-Release 'A validação do Windows falhou.'
}

npm run validate:android

if ($LASTEXITCODE -ne 0) {
  Stop-Release 'A validação do Android falhou.'
}

git add -A

$staged = @(
  git diff --cached --name-only
)

$forbiddenStaged =
  $staged | Where-Object {
    $_ -match '(^|/)\.env($|\.)' -or
    $_ -match 'google-services\.json$' -or
    $_ -match '\.(jks|keystore)$'
  }

if ($forbiddenStaged.Count -gt 0) {
  git reset
  Stop-Release (
    'A publicação tentou incluir arquivos sensíveis: ' +
    ($forbiddenStaged -join ', ')
  )
}

if ($staged.Count -gt 0) {
  git commit -m "release: Crypt v$version"

  if ($LASTEXITCODE -ne 0) {
    Stop-Release 'Não foi possível criar o commit da release.'
  }
}

git tag -a $tag -m "Crypt v$version — A Ascensão Arcana"

if ($LASTEXITCODE -ne 0) {
  Stop-Release 'Não foi possível criar a tag.'
}

git push origin main

if ($LASTEXITCODE -ne 0) {
  Stop-Release 'Falha ao enviar a branch main.'
}

git push origin $tag

if ($LASTEXITCODE -ne 0) {
  Stop-Release 'Falha ao enviar a tag da release.'
}

Write-Host ''
Write-Host 'PUBLICAÇÃO INICIADA.' -ForegroundColor Green
Write-Host 'Acompanhe os workflows no GitHub Actions.' -ForegroundColor Cyan
Write-Host ''
Read-Host 'Pressione Enter para fechar'
