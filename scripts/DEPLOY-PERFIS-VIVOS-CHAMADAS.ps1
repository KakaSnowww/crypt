$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT — PUBLICAR IDENTIDADE DAS CHAMADAS' -ForegroundColor Magenta
Write-Host ''

npx supabase functions deploy livekit-token --no-verify-jwt

if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'A publicação falhou. Confira o login e o vínculo do Supabase.' -ForegroundColor Red
  Write-Host ''
  Read-Host 'Pressione Enter para fechar'
  exit $LASTEXITCODE
}

Write-Host ''
Write-Host '[OK] Função livekit-token publicada.' -ForegroundColor Green
Write-Host ''
Read-Host 'Pressione Enter para fechar'
