$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT — VERIFICAÇÃO DA ENTRADA NO SERVIDOR' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$checks = @(
  @{
    File = 'src\app\router.tsx'
    Pattern = "servidores/:serverId/abrir"
    Label = 'rota inteligente'
  },
  @{
    File = 'src\app\lazyRoutes.tsx'
    Pattern = 'ServerOpenRoute'
    Label = 'carregamento da rota'
  },
  @{
    File = 'src\components\layout\AppShell.tsx'
    Pattern = 'servidores/\$\{server\.server_id\}/abrir'
    Label = 'ícones dos servidores'
  },
  @{
    File = 'src\routes\ServersRoute.tsx'
    Pattern = 'servidores/\$\{server\.server_id\}/abrir'
    Label = 'cartões dos servidores'
  },
  @{
    File = 'src\routes\ServerInviteRoute.tsx'
    Pattern = 'servidores/\$\{serverId\}/abrir'
    Label = 'entrada após convite'
  },
  @{
    File = 'src\routes\ChannelRoute.tsx'
    Pattern = 'rememberServerChannel'
    Label = 'memória de canal de texto'
  },
  @{
    File = 'src\routes\VoiceRoomRoute.tsx'
    Pattern = 'rememberServerChannel'
    Label = 'memória de canal de voz'
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
} else {
  Write-Host 'Existem pendências listadas acima.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
