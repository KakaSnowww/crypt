# Voz e vídeo — Fase 11

## Arquitetura

Cada canal `voice` ou `video` corresponde a uma sala LiveKit chamada `crypt-{channel_uuid}`. O UUID
evita colisões e não depende do nome visível. O LiveKit cria a sala quando o primeiro participante
entra e encerra a sala vazia automaticamente.

O frontend nunca conhece `LIVEKIT_API_KEY` nem `LIVEKIT_API_SECRET`. A Edge Function
`livekit-token`:

1. valida origem e Publishable key;
2. valida o JWT com `auth.getUser()`;
3. chama `get_voice_channel_access` usando a sessão real;
4. confirma tipo, associação e permissão de visualizar o canal;
5. usa nome e identidade armazenados no banco;
6. emite um token LiveKit limitado a uma única sala;
7. para a projeção Android, emite um token auxiliar de duas horas que só publica a tela e não
   assina mídia.

O token permite inscrição em mídia e só permite publicação quando a pessoa possui
`Enviar mensagens` no canal. A expiração limita novas conexões; a reconexão ativa continua sendo
tratada pelo SDK.

## Recursos

- áudio;
- câmera;
- compartilhamento de tela;
- seleção de microfone, câmera e saída oferecida pelo navegador;
- presença real da sala consultada pelo backend no LiveKit para membros que ainda não entraram;
- modo natural de microfone em 48 kHz, sem processamento automático;
- enquadramento de câmera alternável entre imagem inteira e preenchimento;
- visualização responsiva dos participantes;
- reconexão automática;
- botão de retomada de áudio para restrições de autoplay;
- canal de vídeo iniciando com câmera quando permitido;
- consentimento antes de solicitar dispositivos.

No site, o seletor de compartilhamento é obrigatoriamente controlado pelo navegador. O Electron usa
o capturador nativo do Chromium e o Android usa `MediaProjection` com o SDK Android do LiveKit. A
interface do Crypt continua responsável por iniciar e encerrar a transmissão.

## Configuração do LiveKit Cloud

Crie um projeto no LiveKit Cloud e copie:

- Project URL no formato `wss://...`;
- API Key;
- API Secret.

Crie localmente um arquivo ignorado chamado `.env.livekit.local`:

```env
LIVEKIT_URL=wss://SEU-PROJETO.livekit.cloud
LIVEKIT_API_KEY=SUA_API_KEY
LIVEKIT_API_SECRET=SUA_API_SECRET
```

Envie os segredos e apague o arquivo local:

```powershell
npx supabase secrets set --env-file .env.livekit.local
Remove-Item .env.livekit.local
npm run supabase:functions:deploy
```

Nunca coloque esses valores em `.env.local`, `VITE_*`, GitHub ou mensagens.

## Segurança do banco

`get_voice_channel_access` não aceita identidade, nome, servidor ou permissão enviados pelo
frontend. Tudo é derivado de `auth.uid()` e das tabelas protegidas.

Um canal ocultado por override não recebe token. Uma terceira conta fora do servidor também não
recebe token. O trigger `channel_messages_require_text_channel` impede que a RPC de texto seja
usada em canais de voz ou vídeo.

## Teste manual

1. Crie um canal de voz e um de vídeo em **Organizar servidor**.
2. Abra duas sessões com contas membros.
3. Entre no canal de voz e permita o microfone.
4. Confirme áudio nas duas direções.
5. Alterne mudo e selecione outro dispositivo, se disponível.
6. Ative e desative a câmera.
7. Compartilhe uma janela ou tela.
8. Deixe a segunda conta fora da call e confirme que ela enxerga quem está no canal.
9. Recarregue uma sessão e confirme a reconexão.
10. Teste o canal de vídeo, que solicita câmera ao conectar.
11. Negue `Ver canal` à segunda conta e confirme que a sala desaparece e a URL direta é recusada.
12. Confirme que uma terceira conta fora do servidor não recebe token.
