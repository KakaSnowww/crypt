# Releases e atualizações do Android

## O que a Fase 17 entrega

O Crypt consulta a Release pública mais recente do repositório `KakaSnowww/crypt`. Quando encontra
uma versão superior à instalada, exibe o botão de atualização no cabeçalho e em **Conta e
segurança**.

O APK é baixado pelo `DownloadManager` do Android para a pasta externa privada do aplicativo. O
Crypt aceita somente URLs HTTPS no caminho oficial de releases do próprio repositório. Depois do
download, o instalador do Android mostra a confirmação final. Aplicativos comuns não podem instalar
uma atualização silenciosamente.

## 1. Criar a assinatura permanente

Faça isto uma única vez. Fechar, substituir ou perder o arquivo `.keystore` impede a publicação de
atualizações compatíveis com instalações anteriores.

No PowerShell:

```powershell
cd C:\Users\Snow\Documents\Crypt

.\scripts\configure-android-release.ps1 `
  -GoogleServicesJson "C:\Users\Snow\Downloads\google-services.json"
```

O script solicita uma senha forte e cria:

```text
android\crypt-release.keystore
```

Faça imediatamente uma cópia desse arquivo em um local privado e seguro. Ele está bloqueado pelo
`.gitignore` e nunca deve ser enviado ao repositório.

O script copia, um de cada vez, os valores destes Repository Secrets:

- `ANDROID_KEYSTORE_BASE64`;
- `ANDROID_KEYSTORE_PASSWORD`;
- `ANDROID_KEY_ALIAS`;
- `ANDROID_KEY_PASSWORD`;
- `ANDROID_GOOGLE_SERVICES_JSON_BASE64`.

Crie cada valor em:

**GitHub → Settings → Secrets and variables → Actions → New repository secret**.

Se o GitHub CLI estiver instalado e autenticado, a configuração pode ser automática:

```powershell
.\scripts\configure-android-release.ps1 `
  -GoogleServicesJson "C:\Users\Snow\Downloads\google-services.json" `
  -UploadToGitHub
```

## 2. Segredos já utilizados pelo frontend

O workflow Android também utiliza os Repository Secrets existentes:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`;
- `VITE_LIVEKIT_URL`.

Nenhuma `service_role`, senha do banco ou credencial do Firebase Admin entra no APK.

## 3. Validar localmente

```powershell
cd C:\Users\Snow\Documents\Crypt

npm ci
npm run validate:android
```

O APK `debug` continua disponível para desenvolvimento:

```powershell
npm run android:build:debug
```

## 4. Publicar a versão 0.4.0

Depois do commit da fase:

```powershell
git tag v0.4.0
git push origin v0.4.0
```

O workflow **Publicar aplicativo Android** valida o projeto, reconstrói o aplicativo com os
segredos de produção e publica:

- `Crypt-Android-0.4.0.apk` para instalação direta;
- `Crypt-Android-0.4.0.aab` para uma futura publicação na Play Store;
- `Crypt-Android-0.4.0.sha256` para conferir a integridade.

## 5. Primeira troca do debug para produção

O aplicativo instalado pelos testes anteriores foi assinado com a chave de desenvolvimento do
Android. Ele não pode ser atualizado diretamente pelo APK de produção, pois as assinaturas são
diferentes.

Somente nesta primeira troca:

1. confirme que seus dados estão sincronizados com o Supabase;
2. desinstale o Crypt de teste do celular;
3. baixe `Crypt-Android-0.4.0.apk` na Release;
4. instale o APK de produção;
5. entre novamente na conta e aceite as permissões.

Da versão `0.4.0` em diante, não desinstale. As próximas versões usarão a mesma assinatura e serão
instaladas por cima, preservando sessão e preferências.

## 6. Fluxo de atualização

1. O Crypt consulta `releases/latest` no GitHub ao abrir e depois a cada quatro horas.
2. A versão é comparada numericamente com a versão realmente instalada no Android.
3. O usuário toca no botão de atualização.
4. O Android baixa o APK oficial e mostra o progresso.
5. Na primeira atualização, o Android pode pedir autorização para **Instalar apps desconhecidos**
   para o Crypt.
6. O instalador nativo confere a assinatura e solicita confirmação.
7. Ao abrir a nova versão, o Crypt mostra as notas da atualização.

## Segurança

- O domínio e o caminho do APK são validados no TypeScript e novamente no plugin Java.
- O arquivo precisa se chamar `Crypt-Android-VERSÃO.apk`.
- APKs de rascunhos ou pré-lançamentos são ignorados.
- O download fica na pasta privada do aplicativo, sem permissão geral de armazenamento.
- O Android rejeita automaticamente um APK assinado por uma chave diferente.
- A autorização de fontes externas permite somente ao Crypt abrir seu instalador; ela não remove a
  confirmação final do Android.
