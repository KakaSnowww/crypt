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

function Read-SecretFromClipboard([string]$Label) {
  while ($true) {
    Write-Host ''
    Write-Host "Copie $Label para a área de transferência." -ForegroundColor Cyan
    Write-Host 'Depois volte para esta janela e pressione Enter.' -ForegroundColor Yellow
    Read-Host | Out-Null

    try {
      $clipboardValue = Get-Clipboard -Raw -ErrorAction Stop
    } catch {
      Add-Type -AssemblyName System.Windows.Forms
      $clipboardValue = [System.Windows.Forms.Clipboard]::GetText()
    }

    $plain = [string]$clipboardValue

    if ($plain.Trim()) {
      try {
        Set-Clipboard -Value '' -ErrorAction SilentlyContinue
      } catch {
        # Limpar a área de transferência é opcional.
      }

      Write-Host "[OK] $Label capturada sem exibir o conteúdo." -ForegroundColor Green
      return $plain.Trim()
    }

    Write-Host 'A área de transferência está vazia. Copie a chave e tente novamente.' -ForegroundColor Red
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

function New-WebhookToken {
  $bytes = [byte[]]::new(48)
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()

  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }

  return [Convert]::ToBase64String($bytes).
    TrimEnd('=').
    Replace('+', '-').
    Replace('/', '_')
}

function Invoke-AsaasApi(
  [string]$Method,
  [string]$Path,
  [string]$ApiBaseUrl,
  [string]$ApiKey,
  $Body = $null
) {
  $headers = @{
    accept = 'application/json'
    access_token = $ApiKey
    'User-Agent' = 'Crypt/0.11.1'
  }

  $parameters = @{
    Uri = "$ApiBaseUrl$Path"
    Headers = $headers
    Method = $Method
  }

  if ($null -ne $Body) {
    $parameters.ContentType = 'application/json'
    $parameters.Body = ($Body | ConvertTo-Json -Depth 20)
  }

  return Invoke-RestMethod @parameters
}

if (-not (Test-Path (Join-Path $project 'package.json'))) {
  Stop-WithMessage 'A pasta do projeto Crypt não foi encontrada.'
}

Set-Location $project

Write-Host ''
Write-Host 'CRYPT — CONFIGURAÇÃO DA ARCANA COM ASAAS' -ForegroundColor Magenta
Write-Host 'Preço configurado: R$ 5,00 por mês.' -ForegroundColor DarkGray
Write-Host 'As credenciais não serão gravadas no projeto.' -ForegroundColor DarkGray
Write-Host ''

Write-Host 'Escolha o ambiente:' -ForegroundColor Cyan
Write-Host '  1 - Sandbox (recomendado para os primeiros testes)'
Write-Host '  2 - Produção'
$environmentChoice = (Read-Host 'Opção').Trim()

if ($environmentChoice -eq '2') {
  $apiBaseUrl = 'https://api.asaas.com/v3'
  $environmentLabel = 'PRODUÇÃO'
} else {
  $apiBaseUrl = 'https://api-sandbox.asaas.com/v3'
  $environmentLabel = 'SANDBOX'
}

Write-Host ''
Write-Host "Ambiente selecionado: $environmentLabel" -ForegroundColor Yellow
Write-Host ''

$apiKey = Read-SecretFromClipboard 'a ASAAS_API_KEY'
$notificationEmail = Read-RequiredText 'E-mail para avisos de falha do Webhook'

if ($notificationEmail -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
  Stop-WithMessage 'Informe um e-mail válido para o Webhook.'
}

$supabaseUrl = Read-SupabaseUrl

if (-not $supabaseUrl) {
  Stop-WithMessage 'VITE_SUPABASE_URL não encontrada nos arquivos .env.'
}

Write-Host ''
Write-Host 'Validando a API Key no Asaas...' -ForegroundColor Cyan

try {
  $webhooks = Invoke-AsaasApi `
    -Method 'GET' `
    -Path '/webhooks?offset=0&limit=100' `
    -ApiBaseUrl $apiBaseUrl `
    -ApiKey $apiKey
} catch {
  Stop-WithMessage 'O Asaas recusou a API Key ou o ambiente selecionado está incorreto.'
}

Write-Host '[OK] API Key aceita.' -ForegroundColor Green

$webhookToken = New-WebhookToken
$webhookUrl = "$supabaseUrl/functions/v1/arcana-billing/webhook"
$events = @(
  'CHECKOUT_PAID',
  'CHECKOUT_CANCELED',
  'CHECKOUT_EXPIRED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED'
)

$webhookBody = @{
  name = 'Crypt Arcana'
  url = $webhookUrl
  email = $notificationEmail
  enabled = $true
  interrupted = $false
  apiVersion = 3
  authToken = $webhookToken
  sendType = 'SEQUENTIALLY'
  events = $events
}

$existingWebhook = $null

if ($webhooks.data) {
  $existingWebhook = $webhooks.data |
    Where-Object {
      $_.name -eq 'Crypt Arcana' -or
      $_.url -eq $webhookUrl
    } |
    Select-Object -First 1
}

Write-Host ''
if ($existingWebhook -and $existingWebhook.id) {
  Write-Host 'Atualizando Webhook existente no Asaas...' -ForegroundColor Cyan

  $null = Invoke-AsaasApi `
    -Method 'PUT' `
    -Path "/webhooks/$($existingWebhook.id)" `
    -ApiBaseUrl $apiBaseUrl `
    -ApiKey $apiKey `
    -Body $webhookBody
} else {
  Write-Host 'Criando Webhook no Asaas...' -ForegroundColor Cyan

  $null = Invoke-AsaasApi `
    -Method 'POST' `
    -Path '/webhooks' `
    -ApiBaseUrl $apiBaseUrl `
    -ApiKey $apiKey `
    -Body $webhookBody
}

Write-Host '[OK] Webhook configurado.' -ForegroundColor Green

$tempFile = Join-Path $env:TEMP "crypt-arcana-asaas-$([Guid]::NewGuid().ToString('N')).env"

try {
  $secretContent = @"
ASAAS_API_KEY=$apiKey
ASAAS_API_BASE_URL=$apiBaseUrl
ASAAS_WEBHOOK_TOKEN=$webhookToken
ASAAS_WEBHOOK_NOTIFICATION_EMAIL=$notificationEmail
ARCANA_MONTHLY_PRICE_BRL=5.00
"@

  [System.IO.File]::WriteAllText(
    $tempFile,
    $secretContent,
    $utf8WithoutBom
  )

  Write-Host ''
  Write-Host 'Enviando secrets ao Supabase...' -ForegroundColor Cyan
  & npx supabase secrets set --env-file $tempFile
  Assert-CommandSucceeded 'enviar secrets ao Supabase'
} finally {
  if (Test-Path $tempFile) {
    Remove-Item $tempFile -Force
  }

  Remove-Variable apiKey, webhookToken -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'Aplicando migration da Arcana...' -ForegroundColor Cyan
& npx supabase db push
Assert-CommandSucceeded 'aplicar migration'

Write-Host ''
Write-Host 'Publicando arcana-billing...' -ForegroundColor Cyan
& npx supabase functions deploy arcana-billing --no-verify-jwt
Assert-CommandSucceeded 'publicar arcana-billing'

Write-Host ''
Write-Host 'CONFIGURAÇÃO CONCLUÍDA' -ForegroundColor Green
Write-Host ''
Write-Host "Ambiente: $environmentLabel"
Write-Host "Webhook: $webhookUrl"
Write-Host ''
Write-Host 'Teste primeiro no Sandbox antes de escolher Produção.' -ForegroundColor Yellow
Write-Host ''
Read-Host 'Pressione Enter para fechar'
