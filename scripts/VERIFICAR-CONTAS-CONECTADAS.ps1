$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
$requiredSecrets = @(
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'STEAM_WEB_API_KEY',
  'EXTERNAL_CONNECTIONS_ENCRYPTION_KEY',
  'ALLOWED_ORIGINS'
)

function Test-Step([bool]$Condition, [string]$Success, [string]$Failure) {
  if ($Condition) {
    Write-Host "[OK] $Success" -ForegroundColor Green
    return $true
  }

  Write-Host "[ERRO] $Failure" -ForegroundColor Red
  return $false
}

function Read-SupabaseUrl {
  foreach ($name in @('.env.local', '.env', '.env.development', '.env.production')) {
    $file = Join-Path $project $name
    if (-not (Test-Path $file)) {
      continue
    }

    foreach ($line in Get-Content $file) {
      if ($line -match '^\s*VITE_SUPABASE_URL\s*=\s*(.+?)\s*$') {
        return $Matches[1].Trim().Trim('"').Trim("'").TrimEnd('/')
      }
    }
  }

  return $null
}

if (-not (Test-Path (Join-Path $project 'package.json'))) {
  Write-Host 'Projeto Crypt não encontrado.' -ForegroundColor Red
  Read-Host 'Pressione Enter para fechar'
  exit 1
}

Set-Location $project

Write-Host ''
Write-Host 'CRYPT — VERIFICAÇÃO DE CONTAS CONECTADAS' -ForegroundColor Magenta
Write-Host ''

$allPassed = $true

$files = @(
  'src\routes\ConnectedAccountsRoute.tsx',
  'src\features\externalConnections\externalConnections.service.ts',
  'src\features\externalConnections\ExternalActivitySync.tsx',
  'supabase\functions\external-oauth\index.ts',
  'supabase\migrations\20260803233000_phase23_external_oauth.sql'
)

foreach ($relative in $files) {
  $exists = Test-Path (Join-Path $project $relative)
  if (-not (Test-Step $exists $relative "Arquivo ausente: $relative")) {
    $allPassed = $false
  }
}

Write-Host ''
Write-Host 'Consultando secrets...' -ForegroundColor Cyan
$secretOutput = (& npx supabase secrets list 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
  Write-Host $secretOutput
  Write-Host '[ERRO] Não foi possível consultar o Supabase.' -ForegroundColor Red
  $allPassed = $false
} else {
  foreach ($name in $requiredSecrets) {
    if (-not (Test-Step ($secretOutput -match [Regex]::Escape($name)) $name "Secret ausente: $name")) {
      $allPassed = $false
    }
  }
}

Write-Host ''
Write-Host 'Consultando Edge Functions...' -ForegroundColor Cyan
$functionOutput = (& npx supabase functions list 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
  Write-Host $functionOutput
  Write-Host '[ERRO] Não foi possível listar as Edge Functions.' -ForegroundColor Red
  $allPassed = $false
} elseif (-not (Test-Step ($functionOutput -match 'external-oauth') 'external-oauth publicada' 'external-oauth não encontrada')) {
  $allPassed = $false
}

$supabaseUrl = Read-SupabaseUrl
Write-Host ''
if ($supabaseUrl) {
  Write-Host 'Callbacks esperadas:' -ForegroundColor Cyan
  Write-Host "Spotify:        $supabaseUrl/functions/v1/external-oauth/callback/spotify"
  Write-Host "Google/YouTube: $supabaseUrl/functions/v1/external-oauth/callback/youtube"
  Write-Host "Steam:          $supabaseUrl/functions/v1/external-oauth/callback/steam"
} else {
  Write-Host '[AVISO] VITE_SUPABASE_URL não encontrada nos arquivos .env.' -ForegroundColor Yellow
}

Write-Host ''
if ($allPassed) {
  Write-Host 'VERIFICAÇÃO CONCLUÍDA SEM PENDÊNCIAS TÉCNICAS.' -ForegroundColor Green
  Write-Host 'Agora teste os três botões Conectar dentro do Crypt.' -ForegroundColor Cyan
} else {
  Write-Host 'Ainda existem pendências listadas acima.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
