# Fase 14.3–14.4 — Chamadas e transmissão nativa no Android

## Arquitetura

A interface da chamada continua compartilhada entre Windows, Android e navegador. No Android, uma
ponte Capacitor acrescenta os recursos que o WebView não oferece de forma adequada:

- serviço em primeiro plano enquanto a chamada está conectada;
- notificação persistente que retorna ao Crypt;
- seleção de auricular, alto-falante, fone com fio e Bluetooth;
- troca entre câmera frontal e traseira;
- captura de tela pela API `MediaProjection`;
- publicação da tela pelo SDK Android do LiveKit;
- transmissão auxiliar invisível na lista de participantes;
- limpeza automática quando o Android encerra a projeção.

O áudio e a câmera da pessoa permanecem na conexão principal. A tela usa um token auxiliar, emitido
pela Edge Function somente depois da mesma verificação de autenticação, servidor, canal e permissão.
Credenciais secretas do LiveKit continuam exclusivamente no Supabase.

## Implantação obrigatória

A Edge Function `livekit-token` mudou e deve ser publicada antes do teste:

```powershell
cd C:\Users\Snow\Documents\Crypt
npm ci
npm run supabase:functions:deploy
npm run validate:android
npm run android:open
```

No Android Studio, aguarde a sincronização do Gradle, selecione o Redmi 10C e clique em **Run**.

## Permissões e comportamento do Android

Na primeira abertura, o Crypt apresenta uma explicação e solicita as permissões de microfone,
câmera, notificações e dispositivos Bluetooth. Se alguma delas for negada, a orientação oferece um
atalho direto para a tela do aplicativo nas configurações do Android.

Fotos e documentos continuam usando o seletor protegido do sistema. Por isso o Crypt não solicita
acesso amplo ao armazenamento: a pessoa escolhe explicitamente cada arquivo que deseja enviar.

O Android sempre exige confirmação do sistema em cada nova transmissão. Isso é uma proteção
obrigatória da API `MediaProjection`, não é o seletor de compartilhamento do navegador.

O aplicativo declara os tipos de serviço exigidos pelo Android 14 ou superior:

- `microphone` para manter a chamada;
- `mediaProjection` para a transmissão da tela.

No Android 13, permita as notificações para enxergar o aviso persistente. A chamada e a projeção
continuam funcionando se o alerta visual estiver desativado, mas o Android poderá mostrar a
atividade apenas no gerenciador de tarefas ativas.

## Qualidade

- **Equilibrada:** 720p, 30 FPS; recomendada para o Redmi 10C, 4G e Wi-Fi comum.
- **Alta:** 1080p, 30 FPS; exige conexão estável e consome mais bateria.
- Simulcast permite que cada pessoa receba a qualidade adequada à própria conexão.
- A preferência do LiveKit mantém resolução quando a banda oscila.

O áudio interno do aparelho não é capturado nesta versão. O microfone continua normalmente durante
a transmissão. Essa limitação fica explícita na interface para não prometer um recurso que o
Android ou alguns aplicativos podem bloquear.

## Checklist com duas contas

1. Reinstale ou limpe os dados do aplicativo e confirme a orientação inicial de permissões.
2. Autorize microfone, câmera, notificações e dispositivos próximos.
3. Entre no mesmo canal pelo Android e pelo Windows.
4. Minimize o Crypt no Android e confirme que o áudio continua.
5. Volte ao aplicativo pela notificação **Voz conectada**.
6. Abra **Dispositivos** e teste auricular e alto-falante.
7. Conecte um fone Bluetooth e confirme que ele aparece na lista.
8. Ligue a câmera e use **Virar câmera**.
9. Navegue para um chat e retorne à chamada sem desconectar.
10. Toque em **Compartilhar tela → Equilibrada → Continuar no Android**.
11. Aceite a confirmação nativa do sistema.
12. Confirme no Windows que a tela aparece sem um participante duplicado.
13. Minimize e abra outro aplicativo; confirme que a imagem continua fluida.
14. Pare pelo Crypt e depois repita encerrando pela notificação do próprio Android.
15. Teste desligar e religar o Wi-Fi durante a chamada.
16. Saia da chamada e confirme que as duas notificações desaparecem.

## Diagnóstico

Se a transmissão não iniciar, confira o Logcat usando os filtros `CryptCall` e `LiveKit`.

Se a Edge Function antiga ainda estiver publicada, a chamada principal funcionará, mas a
transmissão retornará erro ao solicitar o token auxiliar. Execute novamente:

```powershell
npm run supabase:functions:deploy
```
