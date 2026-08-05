$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)

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

function Read-RequiredSecret([string]$Prompt) {
  while ($true) {
    $secure = Read-Host $Prompt -AsSecureString
    $plain = ConvertFrom-SecureStringPlain $secure
    if ($plain.Trim()) {
      return $plain.Trim()
    }

    Write-Host 'O valor não pode ficar vazio.' -ForegroundColor Yellow
  }
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

function Assert-CommandSucceeded([string]$Step) {
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Falha em: $Step"
  }
}

if (-not (Test-Path (Join-Path $project 'package.json'))) {
  Stop-WithMessage 'A pasta do projeto Crypt não foi encontrada.'
}

Set-Location $project

Write-Host ''
Write-Host 'CRYPT — CONFIGURAÇÃO DA COBRANÇA ARCANA' -ForegroundColor Magenta
Write-Host 'Preço fixo configurado neste bloco: R$ 5,00 por mês.' -ForegroundColor DarkGray
Write-Host 'Nenhuma credencial será gravada no projeto.' -ForegroundColor DarkGray
Write-Host ''

Write-Host 'Verificando vínculo com o Supabase...' -ForegroundColor Cyan
& npx supabase functions list | Out-Host
Assert-CommandSucceeded 'verificar vínculo com o Supabase'

$supabaseUrl = Read-SupabaseUrl
if (-not $supabaseUrl) {
  Stop-WithMessage 'VITE_SUPABASE_URL não encontrada nos arquivos .env.'
}

$accessToken = Read-RequiredSecret 'MERCADO_PAGO_ACCESS_TOKEN'
$webhookSecret = Read-RequiredSecret 'MERCADO_PAGO_WEBHOOK_SECRET'

Write-Host ''
Write-Host 'Validando o Access Token no Mercado Pago...' -ForegroundColor Cyan
try {
  $headers = @{ Authorization = "Bearer $accessToken" }
  $null = Invoke-RestMethod `
    -Uri 'https://api.mercadopago.com/users/me' `
    -Headers $headers `
    -Method Get
  Write-Host '[OK] Access Token aceito.' -ForegroundColor Green
} catch {
  Stop-WithMessage 'O Mercado Pago recusou o Access Token. Confira se ele é de produção ou teste e tente novamente.'
}

$tempFile = Join-Path $env:TEMP "crypt-arcana-secrets-$([Guid]::NewGuid().ToString('N')).env"

try {
  $secretContent = @"
MERCADO_PAGO_ACCESS_TOKEN=$accessToken
MERCADO_PAGO_WEBHOOK_SECRET=$webhookSecret
ARCANA_MONTHLY_PRICE_BRL=5.00
"@
  [System.IO.File]::WriteAllText($tempFile, $secretContent, $utf8WithoutBom)

  Write-Host ''
  Write-Host 'Enviando secrets ao Supabase...' -ForegroundColor Cyan
  & npx supabase secrets set --env-file $tempFile
  Assert-CommandSucceeded 'enviar secrets ao Supabase'
} finally {
  if (Test-Path $tempFile) {
    Remove-Item $tempFile -Force
  }
  Remove-Variable accessToken, webhookSecret -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'Aplicando migration da Arcana...' -ForegroundColor Cyan
& npx supabase db push
Assert-CommandSucceeded 'aplicar migration'

Write-Host ''
Write-Host 'Publicando arcana-billing...' -ForegroundColor Cyan
& npx supabase functions deploy arcana-billing --no-verify-jwt
Assert-CommandSucceeded 'publicar arcana-billing'

$webhookUrl = "$supabaseUrl/functions/v1/arcana-billing/webhook"
$returnUrl = "$supabaseUrl/functions/v1/arcana-billing/return"

Write-Host ''
Write-Host 'CONFIGURAÇÃO CONCLUÍDA' -ForegroundColor Green
Write-Host ''
Write-Host 'Webhook da Arcana:' -ForegroundColor Yellow
Write-Host "  $webhookUrl"
Write-Host ''
Write-Host 'Retorno público:' -ForegroundColor Yellow
Write-Host "  $returnUrl"
Write-Host ''
Write-Host 'No painel do Mercado Pago, mantenha habilitados:' -ForegroundColor Cyan
Write-Host '  - subscription_preapproval'
Write-Host '  - subscription_authorized_payment'
Write-Host '  - payment'
Write-Host ''
Write-Host 'O Crypt também envia a notification_url em cada assinatura criada.' -ForegroundColor DarkGray
Write-Host ''
Read-Host 'Pressione Enter para fechar'
