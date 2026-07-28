# Segurança — Fases 3 a 8

## Fronteiras de confiança

O navegador recebe somente Project URL e Publishable key. Ele não é considerado confiável. Banco,
Storage, funções SQL e Edge Functions validam novamente identidade, propriedade e formato.

Secret key, `service_role`, senha do banco e credenciais futuras do LiveKit nunca entram em
`.env.local`, Git ou bundle do Vite.

## Autenticação e rotas

- senhas existem somente no Supabase Auth;
- callbacks usam PKCE;
- sessão é renovada e persistida;
- rotas privadas exigem usuário autenticado;
- contas sem onboarding concluído são encaminhadas para `/onboarding`;
- progresso concluído é lido do banco, não de uma flag local;
- sessão ausente ou expirada volta ao login.

## Perfil público

`profiles` contém somente dados destinados ao perfil. Não há coluna de e-mail, senha ou token.

Constraints limitam:

- nome e biografia;
- caminho do avatar à pasta do próprio UUID;
- Spotify a uma faixa HTTPS no domínio exato;
- consistência entre URL, título e capa.

React renderiza textos como conteúdo, sem interpretar HTML recebido do usuário.

## Interesses e privacidade

Interesses são opcionais e começam ocultos. A pessoa escolhe separadamente:

- mostrar no perfil;
- usar em sugestões;
- ocultar tudo;
- permitir amizade, mensagens e presença;
- mostrar amigos ou servidores em comum.

RLS impede outro usuário de ler seleções ocultas. O aplicativo nunca usa a opção de mostrar no perfil
como autorização para sugestões: são preferências independentes.

Os RPCs recebem somente IDs do catálogo e derivam o dono de `auth.uid()`. Isso impede escolher outro
`profile_id` pela API.

## Amizades, busca e bloqueios

O navegador não recebe permissão de escrita nas tabelas sociais. Todas as ações passam por funções
`security definer` com `search_path` vazio, validação de `auth.uid()` e locks transacionais por par
de usuários.

O banco impede:

- pedido para si mesmo;
- pedido repetido ou invertido;
- pedido entre amigos;
- pedido quando qualquer lado bloqueou o outro;
- pedido para quem desativou essa opção;
- aceite por quem não recebeu o pedido;
- amizade criada diretamente pelo cliente;
- leitura de pedidos ou amizades por uma terceira conta.

Busca e sugestões filtram os bloqueios nos dois sentidos. O autor do bloqueio consegue listar e
remover os próprios bloqueios; a pessoa bloqueada não consegue consultar quem a bloqueou.

A policy antiga que permitia enumerar `profiles` diretamente foi substituída por leitura somente do
próprio perfil. Busca e perfis de terceiros passam por RPCs filtradas, impedindo contornar
`discoverable_by_search` com uma consulta direta à tabela.

## Sugestões transparentes

A pontuação é calculada integralmente em SQL usando interesses e amigos em comum. O cliente informa
somente o limite, que o banco reduz para o intervalo seguro. Nenhum score, rótulo psicológico ou
afirmação de compatibilidade é aceito do navegador.

O consentimento para usar interesses em sugestões é independente da exibição pública. Ignorar uma
sugestão a oculta por 30 dias; “não sugerir novamente” não possui expiração.

Denúncias aceitam somente motivos controlados e até 500 caracteres opcionais. Um lock transacional
e a janela de 24 horas impedem repetição imediata. Somente o autor lê a própria denúncia; a pessoa
denunciada não recebe acesso ao registro.

## Notificações, presença e mensagens privadas

Notificações são criadas dentro da mesma função que cria ou aceita o pedido e só o destinatário pode
ler. O Realtime respeita essa RLS.

Presença fica visível somente para o próprio usuário, amigos ou membros de um mesmo servidor quando
`show_online_status` estiver ativo. O status online expira na consulta após dois minutos sem
heartbeat.

`can_start_direct_message` centraliza bloqueios e a política de novas DMs: qualquer pessoa, somente
amigos, amigos ou servidor compartilhado, ou ninguém. Conversas existentes permanecem no histórico,
mas `can_send_direct_message` impede mensagens, reações e anexos enquanto houver bloqueio.

## Avatar e Storage

O cliente verifica tipo e 2 MB antes do envio para feedback rápido. A proteção real continua no
bucket e nas políticas de `storage.objects`.

Cada caminho começa pelo UUID da sessão. Uma conta não pode inserir, atualizar ou excluir objetos na
pasta de outra. A constraint de `profiles.avatar_path` fornece uma segunda barreira contra associação
indevida.

Quando um avatar é substituído, o perfil aponta primeiro para o novo arquivo e o anterior é removido
depois. Se a atualização do banco falhar, o upload novo é limpo.

## Servidores, membros e convites

As tabelas da Fase 6 não concedem escrita direta ao papel `authenticated`. O navegador chama RPCs
`security definer` com `search_path` vazio.

O banco impede:

- ler servidor ou lista de membros sem associação;
- inserir a si mesmo ou outra pessoa diretamente;
- entrar com código inexistente, revogado, expirado ou esgotado;
- consumir o mesmo convite acima do limite em requisições concorrentes;
- entrar duas vezes;
- entrar quando existe banimento;
- sair enquanto proprietário;
- transferir para alguém que não seja membro;
- alterar ou excluir servidor sem propriedade;
- excluir sem digitar o nome atual.

O código do convite possui 144 bits aleatórios e não contém informação do servidor. A prévia
retornada por um código válido contém somente identidade pública do servidor, proprietário, número
de membros e restrições do convite.

RLS permite ao membro ler a estrutura inicial e ao proprietário ou criador ler seus convites. O
Realtime reutiliza as mesmas políticas.

Ícone e banner usam o bucket `server-media`. A policy exige que o primeiro diretório seja o UUID de
um servidor atualmente pertencente à sessão. A verificação passa por `can_manage_server_media`, que
consulta somente UUID e proprietário com privilégios controlados, sem depender da RLS recursiva de
`servers`. A função de configuração repete a validação do caminho antes de associá-lo à linha do
servidor.

## Canais, cargos e mensagens

O nome visível nunca autoriza acesso. Servidores, categorias, canais, cargos, mensagens e anexos
usam UUID. Uma URL direta chama `can_view_channel` no banco e não contorna a interface.

O cargo `@everyone` é obrigatório e não pode ser excluído ou renomeado. Gerentes de cargo operam
somente abaixo da própria posição e não concedem permissões que não possuem ao criar, mover ou
editar um cargo. O proprietário pode receber cargos visuais, mas continua com controle máximo
independentemente deles. Exceções por categoria e canal também respeitam a hierarquia.

O papel `authenticated` recebe somente leitura RLS das tabelas de mensagem. Envio, edição, exclusão,
reação, fixação e leitura passam por RPCs `security definer` com `search_path` vazio.

Conteúdo é renderizado como texto React, nunca como HTML. A exclusão apaga conteúdo e anexos, mas
conserva a linha lógica para não quebrar respostas. O histórico usa paginação por cursor.

O bucket de anexos é privado. A policy valida servidor, canal, autor, UUID, extensão e permissão
efetiva. O download usa uma URL assinada curta. Excluir mensagem, servidor ou conta também remove os
objetos correspondentes.

Realtime não substitui autorização: eventos Postgres continuam sob RLS e cada leitura passa pelas
funções protegidas. O Broadcast de digitação transmite somente UUID e nome de exibição, nunca o
conteúdo digitado.

## Isolamento das mensagens privadas

Uma DM possui uma chave canônica única para o par, evitando conversas duplicadas. Participação é
armazenada separadamente para permitir fechar a conversa apenas da própria lista e preparar grupos
futuros sem habilitá-los.

Uma terceira conta não lê conversa, participantes, mensagens, reações ou anexos, mesmo conhecendo
todos os UUIDs. As tabelas concedem somente leitura condicionada por RLS; escrita ocorre por RPCs
com `auth.uid()` validado novamente.

O bucket `direct-message-attachments` é privado. A leitura exige participação e a exclusão exige
que o UUID do autor no caminho seja o da sessão. A interface recebe apenas URLs assinadas curtas.

## Spotify

O Crypt aceita somente uma URL de faixa em `open.spotify.com`, remove parâmetros de compartilhamento
e reduz o link ao ID validado da faixa. O iframe é construído diretamente a partir desse ID e usa o
player oficial. O Crypt não baixa, copia, transforma nem hospeda áudio.

## Exclusão de conta

`delete-account` continua validando origem, Publishable key, JWT, senha atual no frontend e a palavra
`EXCLUIR`. A chave administrativa existe somente na Edge Function.

Antes de excluir `auth.users`, a função remove os arquivos de `profile-media`, anexos das DMs,
anexos enviados pela conta, anexos dos servidores pertencentes a ela e suas mídias. Depois, as
relações `on delete cascade` removem perfil, configurações, seleções, associações e servidores. Uma
DM individual com participante excluído também é removida. Se a limpeza falhar, a exclusão é
interrompida.

## Checklist

- [ ] `.env.local` está ignorado.
- [ ] Migrations local e remota possuem as mesmas versões.
- [ ] Interesses novos começam ocultos.
- [ ] Segunda conta não lê interesses privados.
- [ ] Segunda conta lê somente após autorização.
- [ ] Usuário não altera preferências de outra conta.
- [ ] Avatar acima de 2 MB ou com MIME inválido é recusado.
- [ ] Perfil não aceita caminho de avatar de outra conta.
- [ ] Links que não sejam faixas oficiais do Spotify são recusados.
- [ ] Nenhum HTML externo é injetado.
- [ ] E-mail não aparece em perfil ou catálogo.
- [ ] Exclusão da conta remove as mídias do perfil.
- [ ] Pedido para si mesmo ou duplicado é recusado.
- [ ] Terceira conta não lê pedidos ou amizades.
- [ ] Terceira conta não enumera a tabela de perfis.
- [ ] Bloqueado some da busca e das sugestões.
- [ ] Bloqueado não envia pedido, mensagem, reação ou anexo em DM.
- [ ] Sugestão explica somente fatos em comum.
- [ ] Denúncia não fica visível para a pessoa denunciada.
- [ ] Notificações aparecem sem F5 e somente para o destinatário.
- [ ] Terceira conta não lê servidor nem membros sem convite.
- [ ] Convite expirado, revogado ou esgotado não adiciona membro.
- [ ] Entrada concorrente não ultrapassa o limite do convite.
- [ ] Proprietário não sai antes de transferir ou excluir.
- [ ] Transferência aceita somente outro membro.
- [ ] Exclusão exige o nome atual do servidor.
- [ ] Conta não envia mídia para a pasta de servidor alheio.
- [ ] Cargo gerenciador não altera nem atribui cargo igual ou superior ao próprio.
- [ ] Canal negado não aparece e não abre por URL direta.
- [ ] Canal somente leitura recusa envio no banco.
- [ ] Pessoa de fora não lista canal, histórico, reação ou anexo.
- [ ] Mensagem acima de 2.000 caracteres e quarto anexo são recusados.
- [ ] Resposta não referencia mensagem de outro canal.
- [ ] Modo lento é aplicado no banco.
- [ ] Anexo usa bucket privado e URL assinada.
- [ ] Exclusão de mensagem, servidor e conta limpa anexos privados.
- [ ] Não lidas e menções são calculadas somente em canais visíveis.
- [ ] Terceira conta não lista nem consulta a DM entre outras duas pessoas.
- [ ] Fechar uma DM não apaga o histórico e afeta somente a própria lista.
- [ ] Política de novas DMs é aplicada no banco.
- [ ] Moderador não expulsa, bane ou altera o dono.
- [ ] Hierarquia impede moderação de cargo igual ou superior.
- [ ] Membro comum não abre denúncias ou auditoria pela URL direta.
- [ ] Cliente não insere, edita ou apaga registros de auditoria.
- [ ] API Secret do LiveKit existe somente nos segredos da Edge Function.
- [ ] Conta externa não recebe token de uma sala.
- [ ] Canal negado não recebe token mesmo por URL direta.
- [ ] Identidade e permissão do token vêm do banco, não do corpo da requisição.
- [ ] Testes pgTAP passam com três usuários.
