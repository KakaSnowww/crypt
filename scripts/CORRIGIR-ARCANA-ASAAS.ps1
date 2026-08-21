$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path (Join-Path $project 'package.json'))) {
  throw 'Coloque este arquivo dentro da pasta scripts do projeto Crypt.'
}

$target = Join-Path $project 'supabase\functions\arcana-billing\index.ts'
$backup = "$target.backup-before-checkout-fix"
$utf8 = [System.Text.UTF8Encoding]::new($false)

if (-not (Test-Path $target)) {
  throw "Arquivo não encontrado: $target"
}

$content = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($backup, $content, $utf8)

function Replace-Once {
  param(
    [string]$Name,
    [string]$Pattern,
    [string]$Replacement
  )

  $regex = [regex]::new($Pattern)
  $matches = $regex.Matches($script:content)

  if ($matches.Count -ne 1) {
    throw "Não foi possível aplicar '$Name'. Ocorrências encontradas: $($matches.Count). O arquivo pode já estar corrigido ou ser de outra versão."
  }

  $script:content = $regex.Replace($script:content, $Replacement, 1)
  Write-Host "[OK] $Name" -ForegroundColor Green
}

Replace-Once `
  -Name 'remover customerData incompleto' `
  -Pattern '(?m)^[ \t]*customerData:\s*\{\s*email\s*\},\r?\n' `
  -Replacement ''

Replace-Once `
  -Name 'remover parâmetro email não utilizado' `
  -Pattern 'async function startCheckout\(admin: AdminClient, profileId: string, email: string\) \{' `
  -Replacement 'async function startCheckout(admin: AdminClient, profileId: string) {'

Replace-Once `
  -Name 'ajustar chamada do checkout' `
  -Pattern 'await startCheckout\(admin, authentication\.user\.id, authentication\.user\.email\)' `
  -Replacement 'await startCheckout(admin, authentication.user.id)'

$pendingReplacement = "existing.checkout_started_at &&`n    new Date(existing.checkout_started_at).getTime() > Date.now() - 2 * 60 * 1000"

Replace-Once `
  -Name 'corrigir trava de checkout pendente' `
  -Pattern 'existing\.checkout_expires_at\s*&&\s*new Date\(existing\.checkout_expires_at\)\.getTime\(\)\s*>\s*Date\.now\(\)\s*-\s*2\s*\*\s*60\s*\*\s*1000' `
  -Replacement $pendingReplacement

[System.IO.File]::WriteAllText($target, $content, $utf8)

Set-Location $project

Write-Host ''
Write-Host 'Publicando a função arcana-billing...' -ForegroundColor Cyan
& npx supabase functions deploy arcana-billing --no-verify-jwt

if ($LASTEXITCODE -ne 0) {
  throw 'A publicação da função falhou. O backup foi mantido ao lado do arquivo original.'
}

Write-Host ''
Write-Host 'CORREÇÃO CONCLUÍDA' -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor DarkGray
