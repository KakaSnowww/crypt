# Fase 14.2 — Recursos do celular

## Objetivo

Integrar o Crypt à experiência nativa do Android. Chamadas e compartilhamento de tela foram
adicionados posteriormente na entrega unificada das Fases 14.3–14.4.

## Recursos

- notificações locais pela central do Android;
- permissão `POST_NOTIFICATIONS` solicitada sob demanda no Android 13 ou superior;
- canal de alertas com ícone próprio, luz e vibração;
- navegação para DM, menção, amizade ou moderação ao tocar no alerta;
- compartilhamento de convites pelo seletor nativo;
- links de convite `crypt://invite/{código}`;
- feedback tátil leve ao concluir o compartilhamento;
- detecção nativa de Wi-Fi, rede móvel e estado offline;
- pausa e retomada das consultas conforme a conexão;
- presença online quando o aplicativo está ativo e ausente em segundo plano.

O Crypt não solicita câmera ou microfone nesta etapa. Essas permissões continuam aparecendo somente
quando a pessoa usar os recursos correspondentes na Fase 14.3.

## Instalação

```powershell
cd C:\Users\Snow\Documents\Crypt
npm ci
npm run validate:android
adb devices
npm run android:open
```

No Android Studio, aguarde o Gradle, selecione o Redmi 10C e clique em **Run**.

## Checklist

### Notificações

1. Abra **Notificações → Preferências**.
2. Toque em **Permitir no dispositivo**.
3. Aceite a solicitação do Android.
4. Ative **Alertas do sistema** e salve.
5. Pela segunda conta, envie uma mensagem privada.
6. Confirme o alerta com ícone do Crypt.
7. Toque no alerta e confirme a abertura da conversa.
8. Repita com uma menção em canal e um pedido de amizade.

Se a permissão for negada duas vezes, o Android pode exigir que ela seja liberada em
**Configurações → Aplicativos → Crypt → Notificações**.

### Compartilhamento

1. Abra um servidor que permita criar convites.
2. Crie um convite.
3. Confirme que o seletor nativo apresenta WhatsApp, Mensagens e outros aplicativos instalados.
4. Envie o convite para a segunda conta.
5. No aparelho com o Crypt instalado, toque em `crypt://invite/...`.
6. Confirme que a prévia do servidor é aberta.

### Rede e presença

1. Com o Crypt aberto, desligue Wi-Fi e dados móveis.
2. Confirme o aviso **Sem conexão**.
3. Religue a conexão e confirme que o aviso desaparece.
4. Observe a conta Android pela segunda conta.
5. Minimize o Crypt e confirme o estado ausente.
6. Retorne ao Crypt e confirme o estado online.

## Limites desta parte

- alertas dependem do aplicativo ainda estar em execução;
- push com o processo encerrado será configurado com infraestrutura própria;
- chamadas Android e compartilhamento nativo de tela estão documentados em
  `docs/android-calls-screen-share.md`.
