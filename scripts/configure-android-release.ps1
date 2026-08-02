param(
    [Parameter(Mandatory = $true)]
    [string]$GoogleServicesJson,

    [string]$Alias = 'crypt',

    [switch]$UploadToGitHub
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$keystorePath = Join-Path $projectRoot 'android\crypt-release.keystore'
$googleServicesPath = (Resolve-Path $GoogleServicesJson).Path
$passwordSecure = Read-Host 'Crie uma senha forte para a assinatura Android' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)

try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    if ($password.Length -lt 12) {
        throw 'Use uma senha com pelo menos 12 caracteres.'
    }

    if (Test-Path $keystorePath) {
        Write-Host 'Reutilizando a assinatura Android existente.' -ForegroundColor Cyan
        & keytool -list -keystore $keystorePath -alias $Alias -storepass $password *> $null
    }
    else {
        & keytool `
            -genkeypair `
            -v `
            -keystore $keystorePath `
            -alias $Alias `
            -keyalg RSA `
            -keysize 4096 `
            -validity 10000 `
            -storepass $password `
            -keypass $password `
            -dname 'CN=Crypt, OU=Aplicativos, O=Crypt, L=Jaragua do Sul, ST=Santa Catarina, C=BR'
    }

    if ($LASTEXITCODE -ne 0) {
        throw 'O keytool não conseguiu criar a assinatura Android.'
    }

    $keystoreBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystorePath))
    $googleServicesBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($googleServicesPath))

    if ($UploadToGitHub) {
        if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
            throw 'Instale e autentique o GitHub CLI antes de usar -UploadToGitHub.'
        }

        $keystoreBase64 | gh secret set ANDROID_KEYSTORE_BASE64
        $password | gh secret set ANDROID_KEYSTORE_PASSWORD
        $Alias | gh secret set ANDROID_KEY_ALIAS
        $password | gh secret set ANDROID_KEY_PASSWORD
        $googleServicesBase64 | gh secret set ANDROID_GOOGLE_SERVICES_JSON_BASE64

        if ($LASTEXITCODE -ne 0) {
            throw 'Não foi possível enviar todos os segredos ao GitHub.'
        }
    }
    else {
        $secrets = [ordered]@{
            ANDROID_KEYSTORE_BASE64 = $keystoreBase64
            ANDROID_KEYSTORE_PASSWORD = $password
            ANDROID_KEY_ALIAS = $Alias
            ANDROID_KEY_PASSWORD = $password
            ANDROID_GOOGLE_SERVICES_JSON_BASE64 = $googleServicesBase64
        }

        foreach ($entry in $secrets.GetEnumerator()) {
            Set-Clipboard $entry.Value
            Write-Host "Valor de $($entry.Key) copiado." -ForegroundColor Cyan
            Read-Host 'Crie esse Repository Secret no GitHub e pressione Enter para continuar'
        }

        Set-Clipboard ''
    }

    Write-Host ''
    Write-Host 'Assinatura Android criada com sucesso.' -ForegroundColor Green
    Write-Host "Faça backup seguro de: $keystorePath" -ForegroundColor Cyan
    Write-Host 'Sem essa chave não será possível atualizar instalações existentes.' -ForegroundColor Yellow
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $password = $null
}
