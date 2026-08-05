$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Host ''
Write-Host 'CRYPT - VERIFICAÇÃO DE ACESSIBILIDADE E MOBILE' -ForegroundColor Magenta
Write-Host ''

$passed = $true

$checks = @(
  @{
    File = 'src\features\experience\AppExperienceCoordinator.tsx'
    Pattern = 'visualViewport'
    Label = 'teclado e viewport móvel'
  },
  @{
    File = 'src\features\experience\AppExperienceCoordinator.tsx'
    Pattern = 'Pular para o conteúdo'
    Label = 'atalhos de acessibilidade'
  },
  @{
    File = 'src\features\experience\ExperienceSettingsButton.tsx'
    Pattern = 'Experiência do Crypt'
    Label = 'painel de experiência'
  },
  @{
    File = 'src\features\experience\experiencePreferences.ts'
    Pattern = 'crypt.experience.preferences.v1'
    Label = 'preferências persistentes'
  },
  @{
    File = 'src\components\arcane\arcaneVisualMode.ts'
    Pattern = 'synchronizeExperienceStorage'
    Label = 'efeitos sincronizados'
  },
  @{
    File = 'src\styles\accessibility-performance.css'
    Pattern = 'content-visibility'
    Label = 'otimização de listas'
  },
  @{
    File = 'src\styles\accessibility-performance.css'
    Pattern = 'forced-colors'
    Label = 'alto contraste do sistema'
  },
  @{
    File = 'src\main.tsx'
    Pattern = 'AppExperienceCoordinator'
    Label = 'coordenador montado'
  },
  @{
    File = 'src\components\layout\AppShell.tsx'
    Pattern = 'ExperienceSettingsButton'
    Label = 'botão no cabeçalho'
  },
  @{
    File = 'src\styles\globals.css'
    Pattern = 'accessibility-performance.css'
    Label = 'estilos importados'
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
  Write-Host 'BLOCO APLICADO CORRETAMENTE.' -ForegroundColor Green
  Write-Host 'Teste teclado, Android e chamadas.' -ForegroundColor Cyan
} else {
  Write-Host 'Existem pendências listadas acima.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
