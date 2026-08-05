$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT — VERIFICAÇÃO DO BLOCO DE ÁUDIO' -ForegroundColor Magenta
Write-Host ''

$passed = $true
$checks = @(
  @{
    File = 'src\features\voice\VoiceCallProvider.tsx'
    Pattern = 'AudioPresets\.speech'
    Label = 'preset de voz'
  },
  @{
    File = 'src\features\voice\VoiceCallProvider.tsx'
    Pattern = 'dtx:\s*true'
    Label = 'DTX'
  },
  @{
    File = 'src\features\voice\VoiceCallProvider.tsx'
    Pattern = 'VoiceConnectionMonitor'
    Label = 'monitor de conexão'
  },
  @{
    File = 'src\features\voice\VoiceStage.tsx'
    Pattern = 'setMicrophoneEnabled\(!isMicrophoneEnabled\)'
    Label = 'microfone usa configuração central'
  },
  @{
    File = 'src\features\voice\voiceAudioProfile.ts'
    Pattern = 'echoCancellation:\s*processed'
    Label = 'perfis de processamento'
  }
)

foreach ($check in $checks) {
  $path = Join-Path $project $check.File

  if (
    (Test-Path $path) -and
    (Get-Content $path -Raw) -match $check.Pattern
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
