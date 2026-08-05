$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT - VERIFICAÇÃO DO EDITOR DE IMAGENS' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$checks = @(
  @{
    File = 'src\components\common\ImagePositionEditor.tsx'
    Pattern = 'Arraste · roda aplica zoom'
    Label = 'editor avançado'
  },
  @{
    File = 'src\components\common\image-position-editor.css'
    Pattern = 'crypt-image-editor__stage'
    Label = 'estilos do editor'
  },
  @{
    File = 'src\features\profile\components\AvatarEditor.tsx'
    Pattern = 'Reenquadrar atual'
    Label = 'reenquadramento do avatar'
  },
  @{
    File = 'src\features\profile\components\ProfileVisualEditor.tsx'
    Pattern = 'Reenquadrar atual'
    Label = 'reenquadramento do banner'
  },
  @{
    File = 'src\lib\imagePosition.ts'
    Pattern = 'normalizeImagePosition'
    Label = 'limites e precisão'
  },
  @{
    File = 'src\lib\imagePosition.ts'
    Pattern = 'imageSmoothingQuality'
    Label = 'exportação de alta qualidade'
  },
  @{
    File = 'src\routes\ServerSettingsRoute.tsx'
    Pattern = 'ImagePositionEditor'
    Label = 'editor no servidor'
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
