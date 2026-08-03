# Fase 19 — personalização, GIF e enquadramento

## Entrega

- novos visuais de perfil: Oceano, Pôr do sol e Esmeralda;
- GIF em avatar e banner do perfil;
- GIF em ícone e banner do servidor;
- GIF em imagem de grupos privados;
- GIF nas mensagens de canal e mensagens privadas, preservando a animação;
- posicionamento horizontal e vertical para JPG, PNG e WebP antes do upload;
- recorte físico da imagem, mantendo o mesmo enquadramento em todos os dispositivos;
- sons de mensagem, amizade, chamada e atualização com volume reduzido.

## Enquadramento

O editor mostra exatamente a área visível. O usuário move os controles horizontal e vertical e só
depois salva. A imagem estática é recortada no dispositivo antes do envio:

- avatar e ícone: proporção 1:1;
- banner de perfil e servidor: proporção 3,2:1.

GIF não é convertido para não perder a animação; por isso ele é preservado e centralizado.

## Volumes padrão

| Evento                    | Arquivo    | Volume |
| ------------------------- | ---------- | -----: |
| Mensagem ou menção        | `som1.mp3` |    42% |
| Entrada na chamada        | `som2.mp3` |    48% |
| Saída da chamada          | `som3.mp3` |    46% |
| Pedido de amizade         | `som4.mp3` |    50% |
| Inicialização/atualização | `som5.mp3` |    52% |

## Banco e Storage

A migration `20260803120000_phase19_visual_media.sql`:

- libera `image/gif` nos buckets `profile-media`, `server-media` e `direct-group-media`;
- mantém o GIF limitado à pasta pertencente ao perfil, servidor ou grupo;
- amplia a lista segura de efeitos do perfil;
- atualiza a validação de imagem do grupo privado.

Execute `npm run supabase:db:push` antes do teste dos novos formatos.
