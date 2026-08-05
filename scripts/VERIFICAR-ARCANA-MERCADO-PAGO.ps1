$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

$requiredSecrets = @(
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MERCADO_PAGO_WEBHOOK_SECRET',
  'ARCANA_MONTHLY_PRICE_BRL'
)

Write-Host ''
Write-Host 'CRYPT — VERIFICAÇÃO DA COBRANÇA ARCANA' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$files = @(
  'src\routes\ArcanaRoute.tsx',
  'src\features\arcana\arcanaBilling.service.ts',
  'supabase\functions\arcana-billing\index.ts',
  'supabase\migrations\20260804231000_phase26_arcana_billing.sql',
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
if ($LASTEXITCODE -ne 0 -or $functionOutput -notmatch 'arcana-billing') {
  Write-Host '[ERRO] arcana-billing não foi encontrada.' -ForegroundColor Red
  $passed = $false
} else {
  Write-Host '[OK] arcana-billing publicada.' -ForegroundColor Green
}

Write-Host ''
if ($passed) {
  Write-Host 'VERIFICAÇÃO CONCLUÍDA.' -ForegroundColor Green
  Write-Host 'Agora faça uma assinatura usando uma conta de teste do Mercado Pago.' -ForegroundColor Cyan
} else {
  Write-Host 'Ainda existem pendências listadas acima.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
