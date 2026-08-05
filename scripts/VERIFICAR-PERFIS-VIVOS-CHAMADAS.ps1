$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT — VERIFICAÇÃO DOS PERFIS NAS CHAMADAS' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$checks = @(
  @{
    File = 'src\features\voice\VoiceStage.tsx'
    Pattern = 'voice-participant__profile-card'
    Label = 'perfil compacto'
  },
  @{
    File = 'src\features\voice\VoiceStage.tsx'
    Pattern = 'ArcanaTierBadge'
    Label = 'nível Arcana'
  },
  @{
    File = 'src\features\voice\VoiceStage.tsx'
    Pattern = 'bannerPositionX'
    Label = 'enquadramento do banner'
  },
  @{
    File = 'src\features\voice\voice.participant.ts'
    Pattern = 'avatarPositionX'
    Label = 'metadata visual'
  },
  @{
    File = 'supabase\functions\livekit-token\index.ts'
    Pattern = 'profile_gradient_start'
    Label = 'gradiente no token'
  },
  @{
    File = 'supabase\functions\livekit-token\index.ts'
    Pattern = 'arcana_tier_number'
    Label = 'Arcana no token'
  },
  @{
    File = 'src\features\voice\voice-identity.css'
    Pattern = 'voice-participant__profile-card'
    Label = 'estilos da identidade'
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
  Write-Host 'Ainda é necessário publicar livekit-token.' -ForegroundColor Cyan
} else {
  Write-Host 'Existem pendências listadas acima.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
