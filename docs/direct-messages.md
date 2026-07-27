# Mensagens privadas — Fase 9

## Escopo

A Fase 9 implementa conversas individuais entre duas pessoas:

- abertura pelo perfil ou pela lista de amigos;
- lista ordenada pela atividade mais recente;
- envio em tempo real;
- paginação do histórico;
- respostas, edição, exclusão lógica e reações;
- até três anexos privados de 5 MB;
- contador de não lidas e marcação de leitura;
- indicador de digitação por broadcast;
- bloqueios;
- fechamento individual sem apagar o histórico.

O banco separa conversas, participantes e mensagens. Essa estrutura aceita uma futura conversa em
grupo, mas a função pública desta fase cria sempre exatamente duas pessoas.

## Privacidade

Em **Editar perfil → Privacidade**, cada pessoa escolhe quem pode iniciar uma nova conversa:

1. qualquer pessoa;
2. somente amigos;
3. amigos ou membros do mesmo servidor;
4. ninguém.

A escolha vale para novas conversas. Uma conversa existente continua disponível, mas qualquer
bloqueio entre os participantes impede mensagem, reação e anexo novos.

## Segurança

As tabelas de DM não concedem escrita direta ao navegador. Todas as alterações passam por RPCs que
confirmam `auth.uid()` e participação. A leitura usa RLS e a função
`is_direct_conversation_participant`; conhecer um UUID não autoriza acesso.

Anexos usam o bucket privado `direct-message-attachments`, caminho
`conversa/autor/arquivo-aleatório.ext` e URL assinada curta. A migration de correção
`20260726233000_phase9_direct_attachments_rls_fix.sql` garante que somente participantes leem e somente o
autor do caminho exclui.

Fechar uma conversa preenche `hidden_at` apenas para aquela pessoa. Uma nova mensagem reabre a
conversa para os dois lados sem criar outra cópia.

## Teste manual com três contas

Use uma janela normal para a Conta A, uma anônima para B e outro perfil do navegador para C.

### A e B

1. Confirme que A e B são amigas.
2. Em B, escolha **Somente amigos** na privacidade.
3. No perfil de B, pela Conta A, clique em **Mensagem**.
4. Envie mensagens nas duas janelas e confirme atualização sem F5.
5. Teste resposta, edição, reação e exclusão.
6. Envie uma imagem e um TXT menores que 5 MB.
7. Saia da conversa em B, envie por A e confira o contador não lido.
8. Abra a conversa em B e confirme que o contador é limpo.
9. Clique em fechar na lista de A; confirme que o histórico não foi apagado ao abrir novamente.
10. Digite em uma janela e confirme o indicador na outra.

### Privacidade e bloqueio

1. Em B, escolha **Não permitir novas conversas**.
2. Pela Conta C, abra o perfil de B e tente iniciar uma DM; a ação deve ser recusada.
3. Restaure **Somente amigos** em B.
4. Em A, bloqueie B.
5. Confirme que nenhuma das duas contas envia mensagem, reação ou anexo.
6. Desbloqueie para continuar usando a conversa.

### Isolamento da Conta C

1. Copie o UUID da conversa A–B da URL.
2. Na Conta C, tente abrir `/app/mensagens/UUID`.
3. Confirme **Conversa indisponível**.
4. Confirme que a conversa não aparece na lista de C.
5. Nos testes SQL, a chamada direta a `get_direct_messages` também deve retornar
   `direct_access_required`.

## Validação

```powershell
npm run validate
```

Com Docker Desktop:

```powershell
npm run supabase:start
npm run supabase:test
npm run supabase:stop
```

`direct_messages_rls.test.sql` contém 44 verificações, incluindo o isolamento da terceira conta.
