$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT - VERIFICAÇÃO DO EMPACOTAMENTO v0.10.0' -ForegroundColor Magenta
Write-Host ''

node scripts\verify-release.mjs

if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'Existem pendências na release.' -ForegroundColor Red
  Write-Host ''
  Read-Host 'Pressione Enter para fechar'
  exit 1
}

Write-Host ''
Write-Host '[OK] Metadados e scripts da release.' -ForegroundColor Green
Write-Host '[INFO] A publicação ainda não foi iniciada.' -ForegroundColor Cyan
Write-Host ''
Read-Host 'Pressione Enter para fechar'
