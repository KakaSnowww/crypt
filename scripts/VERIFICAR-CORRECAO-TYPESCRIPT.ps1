$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT - VERIFICAÇÃO DA CORREÇÃO TYPESCRIPT' -ForegroundColor Magenta
Write-Host ''

$checks = @(
  @{
    File = 'src\components\layout\AppShell.tsx'
    Pattern = "user\?\.email \?\? 'Pessoa do Crypt'"
    Label = 'fallback da identidade'
  },
  @{
    File = 'src\features\search\globalSearch.queries.ts'
    Pattern = 'GlobalMessageSearchData'
    Label = 'tipagem da busca global'
  },
  @{
    File = 'src\routes\GlobalSearchRoute.tsx'
    Pattern = 'useMemo<GlobalSearchResult\[\]>'
    Label = 'resultados tipados'
  },
  @{
    File = 'src\features\moderation\components\AutoModPanel.test.tsx'
    Pattern = 'common/ToastProvider'
    Label = 'provider no teste do AutoMod'
  },
  @{
    File = 'src\routes\ServerOnboardingRoute.test.tsx'
    Pattern = 'common/ToastProvider'
    Label = 'provider no teste da entrada'
  }
)

$passed = $true

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

$serverRoute = Join-Path $project 'src\routes\ServerRoute.tsx'

if (
  (Test-Path $serverRoute) -and
  (Get-Content $serverRoute -Raw) -notmatch
    'import \{ Link, useNavigate'
) {
  Write-Host '[OK] import não utilizado removido' -ForegroundColor Green
} else {
  Write-Host '[ERRO] import não utilizado ainda existe' -ForegroundColor Red
  $passed = $false
}

Write-Host ''

if (-not $passed) {
  Write-Host 'Existem pendências nos arquivos.' -ForegroundColor Red
  Write-Host ''
  Read-Host 'Pressione Enter para fechar'
  exit 1
}

npm run typecheck

if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'O TypeScript ainda encontrou erros. Copie a nova saída completa.' -ForegroundColor Red
  Write-Host ''
  Read-Host 'Pressione Enter para fechar'
  exit 1
}

Write-Host ''
Write-Host 'TYPECHECK CONCLUÍDO SEM ERROS.' -ForegroundColor Green
Write-Host ''
Read-Host 'Pressione Enter para fechar'
