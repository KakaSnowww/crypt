$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

$checks = @(
  @{
    File = 'src\styles\globals.css'
    Marker = "@import './obsidian-arcana-v2.css';"
    Label = 'import principal'
  },
  @{
    File = 'src\main.tsx'
    Marker = "import './features/appearance/obsidianArcanaRuntime';"
    Label = 'runtime visual'
  },
  @{
    File = 'src\styles\obsidian-arcana-v2.css'
    Marker = "@import './obsidian/08-mobile-accessibility.css';"
    Label = 'agregador CSS'
  },
  @{
    File = 'src\features\appearance\obsidianArcanaRuntime.ts'
    Marker = "root.dataset.obsidianArcana = 'v2';"
    Label = 'identidade V2'
  },
  @{
    File = 'public\obsidian\facet-map.svg'
    Marker = '<svg'
    Label = 'asset facetado'
  }
)

$failed = $false

Write-Host ''
Write-Host 'CRYPT — VERIFICAÇÃO OBSIDIAN ARCANA V2' -ForegroundColor Magenta
Write-Host ''

foreach ($check in $checks) {
  $path = Join-Path $project $check.File

  if (
    (Test-Path $path) -and
    ([System.IO.File]::ReadAllText($path).Contains($check.Marker))
  ) {
    Write-Host "[OK] $($check.Label)" -ForegroundColor Green
  } else {
    Write-Host "[ERRO] $($check.Label)" -ForegroundColor Red
    $failed = $true
  }
}

if ($failed) {
  Write-Host ''
  Write-Host 'O redesign não foi instalado por completo.' -ForegroundColor Red
  Write-Host ''
  Read-Host 'Pressione Enter para fechar'
  exit 1
}

Write-Host ''
Write-Host 'Arquivos do redesign instalados corretamente.' -ForegroundColor Green
Write-Host ''
Read-Host 'Pressione Enter para fechar'
