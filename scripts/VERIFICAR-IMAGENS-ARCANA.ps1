$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$tiers = Join-Path $project 'public\arcana\tiers'
$runes = Join-Path $project 'public\arcana\runes'

$names = @(
  'arcana-01-centelha.png',
  'arcana-02-runa.png',
  'arcana-03-orbe.png',
  'arcana-04-prisma.png',
  'arcana-05-eter.png',
  'arcana-06-eclipse.png',
  'arcana-07-astral.png',
  'arcana-08-arcano.png',
  'arcana-09-celestial.png',
  'arcana-10-ancestral.png',
  'arcana-11-lendario.png',
  'arcana-12-eterno.png'
)

Write-Host ''
Write-Host 'CRYPT — IMAGENS DA ARCANA' -ForegroundColor Magenta
Write-Host ''

try {
  Add-Type -AssemblyName System.Drawing
} catch {
  Write-Host '[AVISO] Dimensões não serão verificadas neste Windows.' -ForegroundColor Yellow
}

$found = 0
foreach ($name in $names) {
  $path = Join-Path $tiers $name
  if (Test-Path $path) {
    $found++
    $detail = ''
    try {
      $image = [System.Drawing.Image]::FromFile($path)
      $detail = " ($($image.Width)x$($image.Height))"
      $square = $image.Width -eq $image.Height
      $image.Dispose()
      if (-not $square) {
        Write-Host "[AVISO] $name$detail não está quadrado." -ForegroundColor Yellow
        continue
      }
    } catch {}
    Write-Host "[OK] $name$detail" -ForegroundColor Green
  } else {
    Write-Host "[FALTA] $name" -ForegroundColor DarkYellow
  }
}

Write-Host ''
Write-Host "Níveis encontrados: $found de 12"

$commonRune = Join-Path $runes 'community-rune.png'
$variantCount = 0
foreach ($slot in 1..3) {
  $variant = Join-Path $runes ("community-rune-0$slot.png")
  if (Test-Path $variant) { $variantCount++ }
}

if ($variantCount -eq 3) {
  Write-Host '[OK] Três Runas diferentes encontradas.' -ForegroundColor Green
} elseif (Test-Path $commonRune) {
  Write-Host '[OK] Runa de Comunidade comum encontrada.' -ForegroundColor Green
  if ($variantCount -gt 0) {
    Write-Host "[INFO] $variantCount variante(s) específica(s) também encontrada(s)."
  }
} else {
  Write-Host '[FALTA] community-rune.png ou as três variantes.' -ForegroundColor DarkYellow
  Write-Host '[INFO] O Crypt usará o símbolo interno até você adicionar a imagem.'
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
