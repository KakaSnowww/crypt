$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT - VERIFICAÇÃO DA BUSCA GLOBAL' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$checks = @(
  @{
    File = 'supabase\migrations\20260805033000_phase28_global_message_search.sql'
    Pattern = 'search_my_message_history'
    Label = 'migration da busca'
  },
  @{
    File = 'src\routes\GlobalSearchRoute.tsx'
    Pattern = 'Busca global'
    Label = 'tela de busca'
  },
  @{
    File = 'src\features\search\globalSearch.service.ts'
    Pattern = 'search_my_message_history'
    Label = 'serviço da busca'
  },
  @{
    File = 'src\features\search\useMessageSearchJump.ts'
    Pattern = 'crypt-message-search-hit'
    Label = 'abertura da mensagem'
  },
  @{
    File = 'src\app\router.tsx'
    Pattern = "path: 'busca'"
    Label = 'rota da busca'
  },
  @{
    File = 'src\components\layout\AppShell.tsx'
    Pattern = '/app/busca'
    Label = 'menu e atalho'
  },
  @{
    File = 'src\routes\ChannelRoute.tsx'
    Pattern = 'useMessageSearchJump'
    Label = 'salto em canais'
  },
  @{
    File = 'src\routes\DirectConversationRoute.tsx'
    Pattern = 'useMessageSearchJump'
    Label = 'salto em conversas privadas'
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
