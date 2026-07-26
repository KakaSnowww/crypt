# Conexões — Fase 5

## Escopo

A área **Conexões** reúne:

- busca exata e parcial pelo `@`;
- amigos online e offline;
- pedidos recebidos e enviados;
- aceitar, recusar e cancelar;
- remover amizade;
- bloquear e desbloquear;
- pessoas para conhecer;
- ignorar por 30 dias;
- não sugerir novamente;
- notificações de pedido e aceite;
- denúncia privada de sugestões e perfis;
- perfis públicos;
- Realtime e presença leve.

## Decisões de produto

O nome “Conexões” descreve relações sociais sem afirmar compatibilidade. A interface nunca diz que
duas pessoas combinam psicologicamente. As explicações usam somente fatos, por exemplo:

> Vocês gostam de Rock, jogos cooperativos e filmes de terror.

A primeira versão não usa inteligência artificial. O score não sai do banco e não aparece como uma
porcentagem para o usuário.

## Privacidade

Nas configurações de perfil, cada pessoa escolhe separadamente:

- aparecer na busca pelo `@`;
- aceitar pedidos;
- usar interesses em sugestões;
- mostrar interesses publicamente;
- mostrar amigos em comum;
- mostrar presença.

Desativar a exibição pública não autoriza nem proíbe o uso em sugestões. São escolhas independentes.

## Realtime

O aplicativo assina somente alterações permitidas pela RLS e invalida as queries de Conexões.
Pedidos e aceites também criam notificações. A presença envia um heartbeat por minuto e é tratada
como offline depois de dois minutos sem atualização.

## Testes manuais

Use duas contas comuns, por exemplo `@kaiosnow` e uma conta de teste.

1. Nas duas contas, conclua o onboarding.
2. Ative “Aparecer na busca por @”, “Permitir pedidos de amizade” e “Usar interesses nas sugestões”.
3. Escolha pelo menos um interesse igual nas duas contas.
4. Na primeira conta, busque exatamente o `@` da segunda.
5. Envie o pedido e confirme que ele aparece em **Pedidos → Enviados**.
6. Na segunda conta, confirme a notificação e o pedido recebido sem atualizar a página.
7. Aceite e confirme a amizade nas duas listas.
8. Abra o perfil público pelo nome.
9. Remova a amizade e confirme nas duas contas.
10. Envie outro pedido, cancele e confirme que desapareceu.
11. Bloqueie a segunda conta.
12. Confirme que ela saiu da busca e das sugestões.
13. Na segunda conta, confirme que não consegue enviar novo pedido.
14. Desbloqueie.
15. Confirme uma sugestão com o texto de interesses em comum.
16. Use **Ignorar** e confirme que a pessoa some.
17. Teste **Não sugerir novamente** com outra sugestão.
18. Desative a busca pelo `@` na segunda conta e confirme que ela não é encontrada.
19. Desative pedidos e confirme que o banco recusa um novo pedido.
20. Envie uma denúncia de teste e confirme a mensagem de sucesso.
21. Tente repetir a mesma denúncia e confirme o limite de 24 horas.
22. Execute `npm run validate`.

Não faça commit antes de concluir esses testes.
