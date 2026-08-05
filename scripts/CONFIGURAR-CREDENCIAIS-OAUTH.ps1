$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
$stateDirectory = Join-Path $env:APPDATA 'Crypt'
$keyFile = Join-Path $stateDirectory 'external-connections-encryption-key.dpapi'
$callbacksFile = Join-Path $stateDirectory 'oauth-callbacks.txt'

function Stop-WithMessage([string]$Message) {
  Write-Host ''
  Write-Host $Message -ForegroundColor Red
  Write-Host ''
  Read-Host 'Pressione Enter para fechar'
  exit 1
}

function ConvertFrom-SecureStringPlain([Security.SecureString]$Value) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Read-RequiredText([string]$Prompt) {
  while ($true) {
    $value = (Read-Host $Prompt).Trim()
    if ($value) {
      return $value
    }

    Write-Host 'O valor não pode ficar vazio.' -ForegroundColor Yellow
  }
}

function Read-RequiredSecret([string]$Prompt) {
  while ($true) {
    $secure = Read-Host $Prompt -AsSecureString
    $plain = ConvertFrom-SecureStringPlain $secure
    if ($plain.Trim()) {
      return $plain
    }

    Write-Host 'O valor não pode ficar vazio.' -ForegroundColor Yellow
  }
}

function Read-SupabaseUrl {
  $candidateFiles = @(
    (Join-Path $project '.env.local'),
    (Join-Path $project '.env'),
    (Join-Path $project '.env.development'),
    (Join-Path $project '.env.production')
  )

  foreach ($file in $candidateFiles) {
    if (-not (Test-Path $file)) {
      continue
    }

    foreach ($line in Get-Content $file) {
      if ($line -match '^\s*VITE_SUPABASE_URL\s*=\s*(.+?)\s*$') {
        $value = $Matches[1].Trim().Trim('"').Trim("'").TrimEnd('/')
        if ($value) {
          return $value
        }
      }
    }
  }

  return (Read-RequiredText 'Cole a VITE_SUPABASE_URL do projeto').TrimEnd('/')
}

function Assert-CommandSucceeded([string]$Step) {
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Falha em: $Step"
  }
}

function Set-SupabaseSecret([string]$Name, [string]$Value) {
  Write-Host "Enviando $Name..." -ForegroundColor Cyan
  & npx supabase secrets set "$Name=$Value"
  Assert-CommandSucceeded "enviar $Name"
}

if (-not (Test-Path (Join-Path $project 'package.json'))) {
  Stop-WithMessage 'A pasta do projeto Crypt não foi encontrada.'
}

Set-Location $project
New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null

Write-Host ''
Write-Host 'CRYPT — CONFIGURAÇÃO DE CONTAS CONECTADAS' -ForegroundColor Magenta
Write-Host 'Os valores digitados não serão gravados no projeto nem exibidos no terminal.' -ForegroundColor DarkGray
Write-Host ''

Write-Host 'Verificando acesso ao Supabase...' -ForegroundColor Cyan
& npx supabase functions list | Out-Host
Assert-CommandSucceeded 'verificar vínculo com o Supabase'

$supabaseUrl = Read-SupabaseUrl

try {
  $parsedSupabaseUrl = [Uri]$supabaseUrl
} catch {
  Stop-WithMessage 'A VITE_SUPABASE_URL não é uma URL válida.'
}

if (
  $parsedSupabaseUrl.Scheme -ne 'https' -or
  -not $parsedSupabaseUrl.Host.EndsWith('.supabase.co')
) {
  Stop-WithMessage 'Use a URL HTTPS oficial do projeto Supabase.'
}

$spotifyClientId = Read-RequiredText 'SPOTIFY_CLIENT_ID'
$spotifyClientSecret = Read-RequiredSecret 'SPOTIFY_CLIENT_SECRET'
$googleClientId = Read-RequiredText 'GOOGLE_OAUTH_CLIENT_ID'
$googleClientSecret = Read-RequiredSecret 'GOOGLE_OAUTH_CLIENT_SECRET'
$steamApiKey = Read-RequiredSecret 'STEAM_WEB_API_KEY'

if (Test-Path $keyFile) {
  try {
    $protectedKey = Get-Content $keyFile -Raw | ConvertTo-SecureString
    $encryptionKey = ConvertFrom-SecureStringPlain $protectedKey
    Write-Host 'Chave de criptografia existente reutilizada.' -ForegroundColor Green
  } catch {
    Stop-WithMessage 'A chave local de criptografia não pôde ser recuperada. Não gere outra por cima de tokens existentes.'
  }
} else {
  $bytes = [byte[]]::new(32)
  [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $encryptionKey = [Convert]::ToBase64String($bytes)
  $protectedKey = ConvertTo-SecureString $encryptionKey -AsPlainText -Force
  $protectedKey | ConvertFrom-SecureString | Set-Content $keyFile -Encoding UTF8
  Write-Host 'Nova chave AES-256 criada e protegida pelo Windows/DPAPI.' -ForegroundColor Green
}

$allowedOrigins = @(
  'http://127.0.0.1:5173',
  'http://localhost',
  'http://localhost:5173',
  'crypt-app://app',
  'https://crypt.local',
  'https://localhost',
  'capacitor://localhost'
) -join ','

Set-SupabaseSecret 'SPOTIFY_CLIENT_ID' $spotifyClientId
Set-SupabaseSecret 'SPOTIFY_CLIENT_SECRET' $spotifyClientSecret
Set-SupabaseSecret 'GOOGLE_OAUTH_CLIENT_ID' $googleClientId
Set-SupabaseSecret 'GOOGLE_OAUTH_CLIENT_SECRET' $googleClientSecret
Set-SupabaseSecret 'STEAM_WEB_API_KEY' $steamApiKey
Set-SupabaseSecret 'EXTERNAL_CONNECTIONS_ENCRYPTION_KEY' $encryptionKey
Set-SupabaseSecret 'ALLOWED_ORIGINS' $allowedOrigins

$spotifyCallback = "$supabaseUrl/functions/v1/external-oauth/callback/spotify"
$youtubeCallback = "$supabaseUrl/functions/v1/external-oauth/callback/youtube"
$steamCallback = "$supabaseUrl/functions/v1/external-oauth/callback/steam"

@"
CRYPT — CALLBACKS DE CONTAS CONECTADAS

Spotify — Redirect URI:
$spotifyCallback

Google/YouTube — Authorized redirect URI:
$youtubeCallback

Steam — Return URL usada automaticamente pelo backend:
$steamCallback

Origem do projeto:
$supabaseUrl
"@ | Set-Content $callbacksFile -Encoding UTF8

Write-Host ''
Write-Host 'Aplicando migrations pendentes...' -ForegroundColor Cyan
& npx supabase db push
Assert-CommandSucceeded 'aplicar migrations'

Write-Host ''
Write-Host 'Publicando external-oauth...' -ForegroundColor Cyan
& npx supabase functions deploy external-oauth --no-verify-jwt
Assert-CommandSucceeded 'publicar external-oauth'

Write-Host ''
Write-Host 'Verificando nomes dos secrets...' -ForegroundColor Cyan
& npx supabase secrets list | Out-Host
Assert-CommandSucceeded 'listar secrets'

Write-Host ''
Write-Host 'CONFIGURAÇÃO CONCLUÍDA' -ForegroundColor Green
Write-Host ''
Write-Host 'Cadastre estas URLs nos painéis dos provedores:' -ForegroundColor Yellow
Write-Host "Spotify:       $spotifyCallback"
Write-Host "Google/YouTube: $youtubeCallback"
Write-Host ''
Write-Host "Uma cópia sem segredos foi salva em: $callbacksFile" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Depois execute scripts\VERIFICAR-CONTAS-CONECTADAS.bat.' -ForegroundColor Cyan
Write-Host ''

Remove-Variable spotifyClientSecret, googleClientSecret, steamApiKey, encryptionKey -ErrorAction SilentlyContinue
Read-Host 'Pressione Enter para fechar'
