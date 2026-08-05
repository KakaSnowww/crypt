$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT — VERIFICAÇÃO DOS CÍRCULOS ARCANOS' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$checks = @(
  @{
    File = 'supabase\migrations\20260805024500_phase27_server_arcana_circles.sql'
    Pattern = 'Círculo Arcano'
    Label = 'migration de níveis'
  },
  @{
    File = 'src\features\servers\serverArcana.service.ts'
    Pattern = 'get_my_server_arcana_statuses'
    Label = 'serviço dos Círculos'
  },
  @{
    File = 'src\features\servers\components\ServerArcanaPanel.tsx'
    Pattern = 'Runas de Comunidade'
    Label = 'painel do servidor'
  },
  @{
    File = 'src\features\servers\components\ServerArcanaSettingsCard.tsx'
    Pattern = 'Identidade do Círculo'
    Label = 'editor de gradiente'
  },
  @{
    File = 'src\features\messages\messages.service.ts'
    Pattern = 'target_server_id'
    Label = 'limite coletivo de anexos'
  },
  @{
    File = 'src\routes\ServerRoute.tsx'
    Pattern = 'ServerArcanaPanel'
    Label = 'painel conectado à rota'
  },
  @{
    File = 'src\routes\ServerSettingsRoute.tsx'
    Pattern = 'ServerArcanaSettingsCard'
    Label = 'configuração conectada'
  },
  @{
    File = 'src\components\layout\AppShell.tsx'
    Pattern = 'circleLevel'
    Label = 'selo na barra de servidores'
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
  Write-Host 'Confirme também que a migration apareceu no Supabase.' -ForegroundColor Cyan
} else {
  Write-Host 'Existem pendências listadas acima.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
