# Fases 13.2 e 13.3 — Aplicativo Windows com Electron

## Objetivo

Esta fase troca somente o shell Windows. O frontend React, Supabase, LiveKit, banco de dados,
Realtime, chamadas e todas as telas já aprovadas continuam compartilhados com o navegador.

O Electron foi escolhido para que o Chromium entregue uma faixa de tela real ao LiveKit. A versão
anterior transformava cada quadro em JPEG, base64 e canvas antes da codificação WebRTC, causando
travamentos e perda de qualidade.

## O que esta fase entrega

- janela própria com nome e ícone do Crypt;
- instância única;
- protocolo `crypt://auth/callback`;
- notificações do sistema;
- seletor próprio com telas e janelas;
- miniaturas atualizadas pelo processo principal;
- captura direta como `MediaStreamTrack`;
- perfis 1280 × 720 e 1920 × 1080 a 30 quadros por segundo;
- preferência de qualidade preservada;
- áudio do sistema opcional por loopback no Windows;
- publicação pelo LiveKit sem JPEG, base64 ou canvas intermediário;
- compartilhamento preservado durante a navegação interna;
- chamada preservada ao ocultar a janela;
- bandeja com ações para abrir ou encerrar completamente;
- posição, tamanho e maximização restaurados com validação de monitor;
- instalador NSIS `.exe`.
- atualização automática pelo GitHub Releases com download em segundo plano;
- página de verificação manual e reinicialização controlada pela pessoa.

## Segurança

- `nodeIntegration` permanece desativado;
- `contextIsolation` e sandbox permanecem ativos;
- o preload oferece somente seleção de captura e recebimento de deep links;
- a interface não recebe acesso ao sistema de arquivos, shell ou Node.js;
- links externos abrem no navegador padrão;
- somente mídia e notificações recebem permissão;
- a Publishable key do Supabase pode permanecer no frontend;
- segredos administrativos e do LiveKit continuam exclusivamente nas Edge Functions.

## Desenvolvimento

```powershell
cd C:\Users\Snow\Documents\Crypt
npm ci
npm run desktop:info
npm run desktop:check
npm run desktop:dev
```

O comando `desktop:dev` compila o processo principal, inicia o Vite e abre o Electron.

No Windows, clicar no `X` oculta a janela e mantém o processo na bandeja. Isso permite que a chamada
e a transmissão continuem. Para encerrar completamente, clique com o botão direito no ícone da
bandeja e escolha **Sair do Crypt**.

Antes de testar o aplicativo instalado, autorize a origem interna nas Edge Functions e publique as
duas funções:

```powershell
npx supabase secrets set "ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,crypt-app://app,https://crypt.local"
npm run supabase:functions:deploy
```

## Validação completa

```powershell
npm run validate:desktop
```

Esse comando executa TypeScript, ESLint, Vitest, Prettier, build Vite e a compilação dos processos
principal e preload do Electron.

## Instalador

```powershell
npm run desktop:build
```

O instalador será criado em:

```text
release\Crypt-Setup-0.2.2.exe
```

Para publicar o instalador junto dos metadados de atualização, use o workflow documentado em
[releases-updates.md](releases-updates.md). O modo de desenvolvimento informa que a atualização
está desativada; somente o aplicativo instalado consulta releases.

## Compartilhamento de tela

1. O seletor React solicita as fontes ao preload.
2. O processo principal usa `desktopCapturer` para listar telas e janelas.
3. A fonte escolhida é validada novamente no processo principal.
4. O `setDisplayMediaRequestHandler` entrega essa fonte ao Chromium.
5. O LiveKit publica a faixa resultante diretamente.

O processo principal não envia quadros para a interface. Isso elimina a compressão local duplicada e
permite que o encoder WebRTC trabalhe diretamente com a captura.

Ao transmitir a tela inteira, deixar o próprio Crypt visível produz o efeito de espelho infinito,
como em outros aplicativos de chamada. Para evitá-lo, compartilhe uma janela específica ou minimize
o Crypt depois de iniciar a transmissão.

## Checklist

- [ ] `npm ci` conclui sem erro;
- [ ] `npm run desktop:check` conclui sem erro;
- [ ] o aplicativo abre em janela própria;
- [ ] uma segunda abertura focaliza a janela existente;
- [ ] login e recuperação por `crypt://` funcionam;
- [ ] o seletor lista telas e janelas sem abrir o seletor padrão;
- [ ] a outra conta recebe imagem fluida e legível;
- [ ] Equilibrada transmite em 720p/30 e Alta qualidade em 1080p/30;
- [ ] o áudio do sistema chega à outra conta;
- [ ] desativar áudio do sistema envia somente vídeo;
- [ ] a transmissão continua ao trocar para chat ou configurações;
- [ ] fechar no `X` oculta na bandeja e mantém a chamada;
- [ ] clicar no ícone da bandeja restaura a janela;
- [ ] Sair do Crypt encerra chamada, câmera, microfone e transmissão;
- [ ] tamanho e posição da janela são restaurados;
- [ ] parar a transmissão encerra a faixa;
- [ ] sair da chamada encerra a captura;
- [ ] câmera, microfone, notificações e sons continuam funcionando;
- [ ] `npm run desktop:build` gera o instalador em `release`.

## Assinatura

O instalador inicial não possui certificado de assinatura de código. O Windows SmartScreen pode
mostrar o aviso de editor desconhecido. Esse aviso não deve ser ocultado ou contornado.
