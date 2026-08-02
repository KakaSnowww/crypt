param(
    [Parameter(Mandatory = $true)]
    [string]$GoogleServicesJson,

    [Parameter(Mandatory = $true)]
    [string]$ServiceAccountJson
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$googleServicesSource = Resolve-Path $GoogleServicesJson
$serviceAccountSource = Resolve-Path $ServiceAccountJson
$googleServices = Get-Content $googleServicesSource -Raw | ConvertFrom-Json
$serviceAccount = Get-Content $serviceAccountSource -Raw | ConvertFrom-Json
$expectedPackage = 'com.kakasnowww.crypt'

$androidPackages = @(
    $googleServices.client |
        ForEach-Object { $_.client_info.android_client_info.package_name }
)

if ($androidPackages -notcontains $expectedPackage) {
    throw "O google-services.json não pertence ao aplicativo $expectedPackage."
}

if (
    $serviceAccount.type -ne 'service_account' -or
    [string]::IsNullOrWhiteSpace($serviceAccount.project_id) -or
    [string]::IsNullOrWhiteSpace($serviceAccount.client_email) -or
    [string]::IsNullOrWhiteSpace($serviceAccount.private_key)
) {
    throw 'O arquivo de conta de serviço do Firebase é inválido.'
}

if ($googleServices.project_info.project_id -ne $serviceAccount.project_id) {
    throw 'Os dois arquivos pertencem a projetos Firebase diferentes.'
}

$randomBytes = New-Object byte[] 48
$randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $randomGenerator.GetBytes($randomBytes)
}
finally {
    $randomGenerator.Dispose()
}
$webhookSecret = [Convert]::ToBase64String($randomBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$privateKey = $serviceAccount.private_key.Replace("`r", '').Replace("`n", '\n').Replace('"', '\"')
$envPath = Join-Path $projectRoot 'supabase\.env.push'
$googleServicesDestination = Join-Path $projectRoot 'android\app\google-services.json'
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)

$secretLines = @(
    "FIREBASE_PROJECT_ID=`"$($serviceAccount.project_id)`""
    "FIREBASE_CLIENT_EMAIL=`"$($serviceAccount.client_email)`""
    "FIREBASE_PRIVATE_KEY=`"$privateKey`""
    "PUSH_WEBHOOK_SECRET=`"$webhookSecret`""
)

Copy-Item $googleServicesSource $googleServicesDestination -Force

try {
    [System.IO.File]::WriteAllLines($envPath, $secretLines, $utf8WithoutBom)

    Push-Location $projectRoot
    try {
        npx supabase secrets set --env-file $envPath
        if ($LASTEXITCODE -ne 0) {
            throw 'O Supabase não aceitou os segredos do Firebase.'
        }

        npx supabase functions deploy push-notifications --no-verify-jwt
        if ($LASTEXITCODE -ne 0) {
            throw 'A Edge Function push-notifications não foi publicada.'
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if (Test-Path $envPath) {
        Remove-Item $envPath -Force
    }
}

Set-Clipboard $webhookSecret

Write-Host ''
Write-Host 'Firebase configurado e Edge Function publicada.' -ForegroundColor Green
Write-Host 'O segredo do webhook foi copiado. Não envie esse valor para ninguém.' -ForegroundColor Yellow
Write-Host 'Agora crie o Database Webhook seguindo docs/push-notifications.md.'
