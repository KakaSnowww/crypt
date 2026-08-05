$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

$requiredSecrets = @(
  'ASAAS_API_KEY',
  'ASAAS_API_BASE_URL',
  'ASAAS_WEBHOOK_TOKEN',
  'ASAAS_WEBHOOK_NOTIFICATION_EMAIL',
  'ARCANA_MONTHLY_PRICE_BRL'
)

Write-Host ''
Write-Host 'CRYPT — VERIFICAÇÃO DA ARCANA ASAAS' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$files = @(
  'src\routes\ArcanaRoute.tsx',
  'src\features\arcana\arcanaBilling.service.ts',
  'supabase\functions\arcana-billing\index.ts',
  'supabase\migrations\20260804234500_phase26_arcana_asaas_billing.sql',
  'android\app\src\main\AndroidManifest.xml'
)

foreach ($relative in $files) {
  if (Test-Path (Join-Path $project $relative)) {
    Write-Host "[OK] $relative" -ForegroundColor Green
  } else {
    Write-Host "[ERRO] Arquivo ausente: $relative" -ForegroundColor Red
    $passed = $false
  }
}

Write-Host ''
Write-Host 'Consultando secrets...' -ForegroundColor Cyan
$secretOutput = (& npx supabase secrets list 2>&1 | Out-String)

if ($LASTEXITCODE -ne 0) {
  Write-Host $secretOutput
  $passed = $false
} else {
  foreach ($name in $requiredSecrets) {
    if ($secretOutput -match [Regex]::Escape($name)) {
      Write-Host "[OK] $name" -ForegroundColor Green
    } else {
      Write-Host "[ERRO] Secret ausente: $name" -ForegroundColor Red
      $passed = $false
    }
  }
}

Write-Host ''
Write-Host 'Consultando Edge Functions...' -ForegroundColor Cyan
$functionOutput = (& npx supabase functions list 2>&1 | Out-String)

if (
  $LASTEXITCODE -ne 0 -or
  $functionOutput -notmatch 'arcana-billing'
) {
  Write-Host '[ERRO] arcana-billing não foi encontrada.' -ForegroundColor Red
  $passed = $false
} else {
  Write-Host '[OK] arcana-billing publicada.' -ForegroundColor Green
}

Write-Host ''
if ($passed) {
  Write-Host 'VERIFICAÇÃO CONCLUÍDA.' -ForegroundColor Green
  Write-Host 'Agora faça uma assinatura usando o Sandbox do Asaas.' -ForegroundColor Cyan
} else {
  Write-Host 'Ainda existem pendências listadas acima.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
