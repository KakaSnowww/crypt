param(
  [switch]$SkipAndroid,
  [switch]$SkipWindows
)

$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$version = '0.11.1'
$output = Join-Path $project "release-local\v$version"

Set-Location $project

function Invoke-Step(
  [string]$Title,
  [scriptblock]$Action
) {
  Write-Host ''
  Write-Host "==> $Title" -ForegroundColor Magenta
  & $Action
}

function Require-Command(
  [string]$Name,
  [string]$Message
) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw $Message
  }
}

Require-Command `
  'node' `
  'Node.js 24 não foi encontrado.'
Require-Command `
  'npm' `
  'npm 11 não foi encontrado.'

$nodeMajor = [int](
  (& node -p "process.versions.node.split('.')[0]").Trim()
)
$npmMajor = [int](
  (& npm --version).Trim().Split('.')[0]
)

if ($nodeMajor -ne 24) {
  throw "Use Node.js 24. Versão atual: $(& node --version)"
}

if ($npmMajor -ne 11) {
  throw "Use npm 11. Versão atual: $(& npm --version)"
}

if (Test-Path $output) {
  Remove-Item $output -Recurse -Force
}

New-Item -ItemType Directory -Path $output -Force |
  Out-Null

Invoke-Step 'Verificar metadados da versão' {
  npm run release:verify
}

if (-not $SkipWindows) {
  Invoke-Step 'Validar aplicação Windows' {
    npm run validate:desktop
  }

  Invoke-Step 'Gerar instalador Windows local' {
    npm run desktop:build
  }

  $windowsFiles = @(
    "release\Crypt-Setup-$version.exe",
    "release\Crypt-Setup-$version.exe.blockmap",
    'release\latest.yml'
  )

  foreach ($relativePath in $windowsFiles) {
    $source = Join-Path $project $relativePath

    if (-not (Test-Path $source)) {
      throw "Artefato Windows ausente: $relativePath"
    }

    Copy-Item $source $output -Force
  }
}

if (-not $SkipAndroid) {
  Require-Command `
    'java' `
    'Java 21 não foi encontrado para o build Android.'

  Invoke-Step 'Validar e sincronizar Android' {
    npm run validate:android
  }

  Invoke-Step 'Gerar APK de teste Android' {
    Push-Location (Join-Path $project 'android')

    try {
      & .\gradlew.bat assembleDebug --no-daemon
    } finally {
      Pop-Location
    }
  }

  $debugApk = Join-Path `
    $project `
    'android\app\build\outputs\apk\debug\app-debug.apk'

  if (-not (Test-Path $debugApk)) {
    throw 'O Gradle não gerou o APK de teste.'
  }

  Copy-Item `
    $debugApk `
    (Join-Path $output "Crypt-Android-$version-debug.apk") `
    -Force
}

Invoke-Step 'Criar checksums SHA-256' {
  node scripts/create-release-checksums.mjs $output
}

$summary = @"
Crypt v$version — build local

Pasta:
$output

O instalador Windows é adequado para teste local.
O APK debug é adequado somente para teste em dispositivo.

A versão Android oficial assinada e o AAB serão
gerados pelo GitHub Actions após a tag v$version.
"@

[System.IO.File]::WriteAllText(
  (Join-Path $output 'LEIA-ME-BUILD-LOCAL.txt'),
  $summary,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host ''
Write-Host 'BUILD LOCAL CONCLUÍDO.' -ForegroundColor Green
Write-Host "Artefatos: $output" -ForegroundColor Cyan
Write-Host ''
