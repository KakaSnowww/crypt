# Perfil visual, navegação e sons

## Banner e efeitos

`profiles.banner_path` guarda apenas o caminho no bucket público `profile-media`. O caminho precisa
pertencer à pasta do próprio perfil e seguir `{profile_id}/banner-{uuid}.{ext}`. O banner aceita
JPG, PNG ou WebP de até 5 MB.

`profiles.profile_effect` aceita `none`, `aurora`, `neon` ou `pulse`. Os efeitos são CSS do Crypt,
respeitam `prefers-reduced-motion` e aparecem no perfil e no cartão sem câmera da chamada.

A Edge Function `livekit-token` inclui banner e efeito nos metadados assinados do participante.
Depois de trocar o visual, saia e entre novamente na chamada para emitir um token novo.

## Sons

Os arquivos ficam em `public/`:

| Arquivo    | Evento                    | Quem ouve                            |
| ---------- | ------------------------- | ------------------------------------ |
| `som1.mp3` | DM recebida ou menção `@` | somente o destinatário               |
| `som2.mp3` | entrada na chamada        | quem entrou e quem já estava na sala |
| `som3.mp3` | saída da chamada          | quem saiu e quem permaneceu na sala  |
| `som4.mp3` | pedido de amizade         | somente quem recebeu o pedido        |

O navegador pode bloquear o primeiro áudio antes de qualquer interação. Entrar em uma chamada,
abrir um canal ou clicar na interface libera a reprodução nos navegadores compatíveis.

## Navegação

Ao abrir um servidor, a coluna principal mostra apenas visão geral, administração e canais daquele
servidor. O menu global do Crypt fica recolhido e pode ser aberto pelo botão de engrenagem no rodapé
da barra de servidores. No Android, as rotas globais continuam na navegação inferior.

## Ordenação

Categorias, canais dentro da mesma categoria e cargos editáveis possuem uma alça de arraste. A
interação usa Pointer Events, portanto funciona com mouse, toque e caneta. A posição final é aplicada
pelas mesmas RPCs protegidas que já validam permissão e hierarquia no banco.
