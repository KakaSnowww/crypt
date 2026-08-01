# Fase 14.1 — Base Android

## Objetivo

Criar o aplicativo Android instalável reutilizando a interface React e os serviços existentes. A
base usa Capacitor 8 e mantém Electron exclusivamente para Windows.

## Compatibilidade

- Android mínimo: 7, API 24;
- alvo atual: Android 16, API 36;
- aparelho principal de teste: Redmi 10C com Android 13;
- Node.js 24 e npm 11;
- Android Studio 2025.2.1 ou mais novo;
- SDK Platform 36 e Android SDK Platform-Tools.

## Recursos desta etapa

- projeto Android em `android/`;
- pacote `com.kakasnowww.crypt`;
- ícones do Crypt;
- splash escuro;
- carregamento dos arquivos Vite locais;
- Supabase, sessão e Realtime;
- deep link de autenticação `crypt://auth/callback`;
- botão físico voltar;
- minimização no início do histórico;
- barra de status;
- área segura;
- correção de redimensionamento com teclado;
- declaração de câmera e microfone sem solicitação antecipada.

Notificações locais chegaram na Fase 14.2. Serviço de chamada, rotas de áudio, câmera e
compartilhamento nativo de tela foram implementados em conjunto nas Fases 14.3–14.4.

## Preparar o computador

No Android Studio, confirme:

1. Android SDK Platform 36;
2. Android SDK Build-Tools;
3. Android SDK Platform-Tools;
4. Android SDK Command-line Tools;
5. JDK integrado do Android Studio.

Valide no PowerShell:

```powershell
java --version
adb version
adb devices
```

No Redmi 10C, habilite **Opções do desenvolvedor** e **Depuração USB**, conecte o cabo e aceite a
autorização RSA.

## Sincronizar e abrir

```powershell
cd C:\Users\Snow\Documents\Crypt
npm ci
npm run android:sync
npm run android:open
```

No Android Studio, aguarde o Gradle terminar, selecione o Redmi 10C e clique em **Run**.

Também é possível executar pelo terminal:

```powershell
npm run android:run
```

## APK de teste

```powershell
npm run android:build:debug
```

O arquivo será criado em:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

Instale no aparelho:

```powershell
adb install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```

## Edge Functions

A origem interna do Android precisa permanecer autorizada:

```powershell
npx supabase secrets set "ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,crypt-app://app,https://crypt.local"
npm run supabase:functions:deploy
```

No Supabase, mantenha `crypt://auth/callback` em **Authentication → URL Configuration → Redirect
URLs**.

## Checklist

- [ ] Gradle sincroniza sem erro;
- [ ] o ícone do Crypt aparece;
- [ ] o splash abre em fundo escuro;
- [ ] cadastro e login funcionam;
- [ ] confirmação de e-mail retorna ao Crypt;
- [ ] a sessão continua após fechar e abrir;
- [ ] o botão voltar navega sem fechar inesperadamente;
- [ ] na tela inicial, voltar minimiza o aplicativo;
- [ ] o teclado não cobre o campo de mensagem;
- [ ] servidor, canais, DMs e perfis carregam;
- [ ] mensagens chegam em tempo real entre Android e Windows;
- [ ] imagem e TXT podem ser enviados;
- [ ] rotação e barras do sistema não cortam controles;
- [ ] o APK instala no Redmi 10C.
