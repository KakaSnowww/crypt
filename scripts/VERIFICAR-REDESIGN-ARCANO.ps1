$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT - VERIFICAÇÃO DO REDESIGN ARCANO' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$checks = @(
  @{
    File = 'src\styles\arcane-theme.css'
    Pattern = 'arcane-atmosphere'
    Label = 'tema global'
  },
  @{
    File = 'src\components\arcane\ArcaneAtmosphere.tsx'
    Pattern = 'Ctrl'
    Label = 'atmosfera e atalho'
  },
  @{
    File = 'src\components\arcane\arcaneVisualMode.ts'
    Pattern = 'crypt.arcane.visual-mode.v1'
    Label = 'intensidade visual'
  },
  @{
    File = 'src\main.tsx'
    Pattern = 'ArcaneAtmosphere'
    Label = 'atmosfera montada'
  },
  @{
    File = 'src\styles\globals.css'
    Pattern = "arcane-theme.css"
    Label = 'tema importado'
  },
  @{
    File = 'src\components\common\Button.tsx'
    Pattern = 'crypt-button'
    Label = 'botões redesenhados'
  },
  @{
    File = 'src\components\common\Input.tsx'
    Pattern = 'crypt-field'
    Label = 'campos redesenhados'
  },
  @{
    File = 'src\components\common\Modal.tsx'
    Pattern = 'crypt-modal'
    Label = 'modais redesenhados'
  },
  @{
    File = 'src\components\layout\AuthLayout.tsx'
    Pattern = 'Conversas que criam'
    Label = 'autenticação redesenhada'
  },
  @{
    File = 'public\arcane\ui\arcane-circle.svg'
    Pattern = '<svg'
    Label = 'círculo arcano local'
  },
  @{
    File = 'public\arcane\ui\constellations.svg'
    Pattern = '<svg'
    Label = 'constelações locais'
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
  Write-Host 'REDESIGN ARCANO APLICADO CORRETAMENTE.' -ForegroundColor Green
  Write-Host 'Use Ctrl + Shift + E para alternar os efeitos.' -ForegroundColor Cyan
} else {
  Write-Host 'Existem pendências listadas acima.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
