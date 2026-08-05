$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT - VERIFICAÇÃO DO AUTOMOD' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$checks = @(
  @{
    File = 'supabase\migrations\20260805041500_phase29_automod_antispam.sql'
    Pattern = 'apply_server_automod'
    Label = 'migration do AutoMod'
  },
  @{
    File = 'src\features\moderation\components\AutoModPanel.tsx'
    Pattern = 'Proteção automática'
    Label = 'painel do AutoMod'
  },
  @{
    File = 'src\features\moderation\automod.service.ts'
    Pattern = 'update_server_automod_settings'
    Label = 'serviço de configurações'
  },
  @{
    File = 'src\features\messages\automodClient.service.ts'
    Pattern = 'get_my_latest_automod_event'
    Label = 'retorno amigável'
  },
  @{
    File = 'src\features\messages\messages.service.ts'
    Pattern = 'fetchLatestAutoModBlock'
    Label = 'mensagens conectadas'
  },
  @{
    File = 'src\routes\ServerModerationRoute.tsx'
    Pattern = 'AutoModPanel'
    Label = 'aba de moderação'
  },
  @{
    File = 'src\features\messages\messages.errors.ts'
    Pattern = 'spam_burst'
    Label = 'mensagens de erro'
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
