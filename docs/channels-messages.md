# Canais, cargos e mensagens — Fases 7 e 8

## Menções

- digitar `@` abre sugestões dos membros do servidor;
- a busca aceita nome de exibição e identificador;
- setas alteram a seleção, enquanto `Enter` ou `Tab` confirmam;
- um `@identificador` completo digitado manualmente também é reconhecido;
- somente o UUID selecionado ou validado é enviado ao banco;
- a pessoa mencionada recebe contagem de menção e uma notificação da Fase 12.

## Entrega unificada

As duas fases compartilham a mesma fronteira de acesso: uma mensagem só existe dentro de um canal e
o canal só fica visível quando as permissões efetivas permitem. Por isso, banco e interface foram
entregues juntos, com duas migrations sequenciais.

## Organização do servidor

Em **Organizar servidor**, proprietários e cargos autorizados podem:

- criar, renomear, excluir e reordenar categorias;
- criar canais com nome livre, ícone separado, tópico, categoria e modo lento;
- mover canais dentro da categoria;
- deixar um canal somente para leitura;
- criar cargos com cor e permissões;
- subir e descer cargos para definir a hierarquia;
- atualizar as permissões do `@everyone`;
- atribuir cargos extras aos membros, inclusive ao proprietário para cor e agrupamento visual;
- criar exceções de permitir, negar ou herdar por categoria e canal.

Na lista de membros, cargos marcados como **Exibir membros deste cargo separadamente** criam
grupos próprios. Se uma pessoa tiver mais de um desses cargos, ela aparece somente no grupo do
cargo mais alto. A cor do nome também segue o cargo mais alto.

Nomes visíveis aceitam espaços, maiúsculas, acentos e emojis. UUIDs são usados em rotas, relações,
Storage e Realtime.

## Permissões

As permissões cobrem administração do servidor, canais, categorias, cargos, convites, membros,
visualização, envio, edição e exclusão próprias, gerenciamento de mensagens, reações, anexos,
menções, fixação e criação de convites.

O proprietário possui controle máximo. `Administrador` também resolve para a máscara completa. Um
gerente de cargos só opera abaixo do próprio cargo mais alto e não concede permissões que não possui
ao criar ou editar cargos.

Uma exceção de canal é aplicada depois da exceção de categoria. Negar prevalece sobre permitir
dentro do mesmo nível; não escolher uma decisão mantém a herança.

## Mensagens

Cada canal oferece:

- histórico de 50 itens por página, carregado por cursor;
- envio com Enter e quebra de linha com Shift + Enter;
- respostas com referência resumida;
- edição e exclusão conforme permissão;
- reações rápidas;
- fixar ou desafixar;
- menções com `@identificador` e `#Nome do Canal`;
- contador de não lidas e menções;
- indicador de digitação sem transmitir o conteúdo digitado;
- até três anexos por mensagem.

Arquivos aceitos: JPG, PNG, WebP, GIF, PDF e texto, até 5 MB cada. O bucket é privado e a visualização
usa uma URL assinada por 15 minutos.

## Realtime

Alterações em canais, cargos, membros, mensagens e leitura invalidam as consultas correspondentes.
Cada assinatura Postgres recebe um tópico exclusivo para evitar colisões no modo estrito do React.
O indicador de digitação usa um gerenciador compartilhado para manter o tópico determinístico entre
usuários sem assinar o mesmo canal duas vezes na mesma aba.

## Teste manual com duas contas

Use uma janela normal para a Conta A e uma anônima para a Conta B. Mantenha ambas no mesmo servidor.

### Categorias e canais

1. Na Conta A, abra o servidor e clique em **Organizar**.
2. Crie a categoria `🎨 Arte e Criação`.
3. Crie o canal `Games e Resenha 🎮`, com ícone `🎮` e um tópico.
4. Confirme que nome, acento, espaço, maiúsculas e emoji são preservados.
5. Reordene categoria e canal.
6. Confirme que a barra lateral muda sem F5 nas duas contas.
7. Edite tópico e modo lento.
8. Marque o canal somente para leitura e confirme que a Conta B não envia.
9. Desmarque a opção para continuar os testes.

### Cargos e acesso

1. Crie o cargo `Criadores` com cor própria.
2. Marque **Exibir membros deste cargo separadamente**, visualização, envio, reações e anexos.
3. Crie outro cargo e use as setas para trocar a ordem da hierarquia.
4. Atribua `Criadores` às Contas A e B; a Conta A pode ser a proprietária.
5. Confirme que ambas aparecem no grupo do cargo e com a cor correspondente.
6. Em **Permissões específicas**, negue **Ver canal** ao `@everyone` no canal novo.
7. Permita **Ver canal** para `Criadores`.
8. Confirme que a Conta B continua vendo o canal.
9. Remova `Criadores` da Conta B e confirme que o canal some sem F5.
10. Tente abrir a URL direta do canal e confirme **Canal indisponível**.
11. Restaure o cargo.

### Conversa

1. Envie uma mensagem em cada conta e confirme atualização sem F5.
2. Feche e reabra o canal; confirme que o histórico continua.
3. Envie mais de 50 mensagens se quiser validar **Carregar mensagens anteriores**.
4. Responda a uma mensagem.
5. Edite uma mensagem própria.
6. Reaja com dois emojis nas duas contas.
7. Fixe e desafixe uma mensagem com uma conta autorizada.
8. Exclua uma mensagem e confirme que aparece como excluída.
9. Digite sem enviar e confirme o indicador na outra janela.
10. Mencione `@identificador` da outra conta.
11. Saia do canal na conta mencionada e confirme o contador de menção.
12. Abra novamente e confirme que o contador é limpo.

### Anexos e limites

1. Envie uma imagem menor que 5 MB.
2. Envie um PDF ou TXT.
3. Confirme que outra conta autorizada abre os arquivos.
4. Tente enviar quatro arquivos; a interface deve manter no máximo três.
5. Tente um arquivo maior que 5 MB ou tipo não permitido; o envio deve ser recusado.
6. Exclua uma mensagem com anexo.
7. Exclua um servidor de teste com anexos.
8. Confirme que as operações concluem sem erro de Storage.

### Isolamento com Conta C

1. Não entre no servidor.
2. Tente a URL direta do canal.
3. Confirme que não vê canal nem histórico.
4. Confirme que não obtém URL de anexo.
5. Entre por convite e confirme que o acesso passa a respeitar os cargos.

## Validação automatizada

```powershell
npm run validate
```

Com Docker Desktop:

```powershell
npm run supabase:start
npm run supabase:test
npm run supabase:stop
```

`workspace_messages_rls.test.sql` possui 62 verificações com proprietário, membro e pessoa de fora.
