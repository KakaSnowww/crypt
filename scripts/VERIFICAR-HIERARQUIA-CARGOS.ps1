$ErrorActionPreference = 'Stop'

$project = Join-Path $env:USERPROFILE 'Documents\Crypt'
Set-Location $project

Write-Host ''
Write-Host 'CRYPT — VERIFICAÇÃO DA HIERARQUIA DE CARGOS' -ForegroundColor Magenta
Write-Host ''

$checks = @(
  @{
    Path = 'supabase\migrations\20260804223000_phase25_role_hierarchy_groups.sql'
    Pattern = 'reorder_server_roles'
    Label = 'Migration e RPC atômica'
  },
  @{
    Path = 'src\features\workspace\workspace.service.ts'
    Pattern = 'reorderRoles'
    Label = 'Serviço de reordenação'
  },
  @{
    Path = 'src\features\workspace\useWorkspaceActions.ts'
    Pattern = 'reorderRoles'
    Label = 'Mutation de hierarquia'
  },
  @{
    Path = 'src\routes\ServerManageRoute.tsx'
    Pattern = 'buildRoleOrderAfterDrop'
    Label = 'Arraste conectado à ordem atômica'
  },
  @{
    Path = 'src\features\workspace\components\ServerMemberGroups.tsx'
    Pattern = 'roleBadges'
    Label = 'Cargos no cartão de perfil'
  }
)

$passed = $true

foreach ($check in $checks) {
  $path = Join-Path $project $check.Path
  $ok = (Test-Path $path) -and (Select-String -Path $path -Pattern $check.Pattern -Quiet)

  if ($ok) {
    Write-Host "[OK] $($check.Label)" -ForegroundColor Green
  } else {
    Write-Host "[ERRO] $($check.Label)" -ForegroundColor Red
    $passed = $false
  }
}

Write-Host ''
if ($passed) {
  Write-Host 'Arquivos instalados corretamente.' -ForegroundColor Green
} else {
  Write-Host 'Existem arquivos ausentes ou não modificados.' -ForegroundColor Red
}

Write-Host ''
Read-Host 'Pressione Enter para fechar'
