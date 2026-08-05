$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT - VERIFICAÇÃO DA ENTRADA DE MEMBROS' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$checks = @(
  @{
    File = 'supabase\migrations\20260805050000_phase30_member_onboarding_rules.sql'
    Pattern = 'server_member_requires_onboarding'
    Label = 'migration e bloqueio'
  },
  @{
    File = 'src\routes\ServerOnboardingRoute.tsx'
    Pattern = 'Entrar no servidor'
    Label = 'tela de entrada'
  },
  @{
    File = 'src\features\server-onboarding\ServerOnboardingGate.tsx'
    Pattern = '/entrada'
    Label = 'redirecionamento protegido'
  },
  @{
    File = 'src\features\server-onboarding\components\ServerOnboardingSettingsCard.tsx'
    Pattern = 'Entrada de novos membros'
    Label = 'configuração do proprietário'
  },
  @{
    File = 'src\app\router.tsx'
    Pattern = "path: 'servidores/:serverId/entrada'"
    Label = 'rota registrada'
  },
  @{
    File = 'src\app\router.tsx'
    Pattern = 'ServerOnboardingGate'
    Label = 'canais protegidos no frontend'
  },
  @{
    File = 'src\routes\ServerSettingsRoute.tsx'
    Pattern = 'ServerOnboardingSettingsCard'
    Label = 'configuração conectada'
  },
  @{
    File = 'src\routes\ServerInviteRoute.tsx'
    Pattern = '/entrada'
    Label = 'convite conectado'
  }
)

foreach ($check in $checks) {
  $path = Join-Path $project $check.File

  if (
    (Test-Path $path) -and
    (Get-Content $path -Raw) -match
      $check.Pattern
  ) {
    Write-Host "[OK] $($check.Label)" -ForegroundColor Green
  } else {
    Write-Host "[ERRO] $($check.Label)" -ForegroundColor Red
    $passed = $false
  }
}

Write-Host ''

if ($passed) {
  Write-Host 'ARQUIVOS DO BLOCO CORRETOS.' -ForegroundColor Green
  Write-Host 'Confirme também a migration no Supabase.' -ForegroundColor Cyan
} else {
  Write-Host 'Existem pendências listadas acima.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
