# Servidores e membros — Fase 6

## Entrega

A Fase 6 transforma os espaços simulados da navegação em servidores privados persistidos no
Supabase.

Inclui:

- criação atômica;
- proprietário e membros;
- cargo de sistema `@everyone`;
- canal inicial `Conversa Geral`;
- convites com validade e limite;
- entrada, saída e atualização por Realtime;
- configurações de identidade e mídia;
- transferência e exclusão;
- RLS e RPCs protegidas.

Categorias, novos canais, cargos personalizados, permissões e mensagens reais estão documentados em
[`channels-messages.md`](channels-messages.md).

## Fluxo de criação

`create_server` recebe somente nome e descrição. O banco usa `auth.uid()` como proprietário e cria
servidor, associação, cargo e canal dentro da mesma transação. Uma falha em qualquer etapa desfaz
tudo.

O nome permite maiúsculas, minúsculas, acentos e espaços. Espaços externos e repetições são
normalizados, sem converter o nome em slug.

## Convites

Um convite pode:

- expirar entre 1 hora e 1 ano ou não expirar;
- possuir de 1 a 1000 usos ou não possuir limite;
- ser copiado como link completo;
- ser revogado pelo criador ou proprietário.

O código é validado e consumido no banco sob lock transacional. Alterar a interface ou chamar a API
manualmente não ignora as restrições.

## Propriedade

O proprietário:

- possui controle máximo nesta fase;
- não pode sair;
- pode transferir somente para outro membro;
- pode alterar nome, descrição, ícone e banner;
- pode excluir após digitar exatamente o nome atual.

Depois da transferência, o antigo proprietário continua membro e pode sair normalmente.

## Teste manual

Use uma janela normal para a Conta A e uma janela anônima para a Conta B.

1. Entre nas duas contas e conclua o onboarding.
2. Na Conta A, abra **Servidores**.
3. Clique em **Criar servidor**.
4. Use um nome com espaço e acento, por exemplo `Órbita do Snow`.
5. Confirme que o servidor aparece na barra lateral.
6. Confirme que **Conversa Geral** foi criado.
7. Confirme que a Conta A aparece com o selo de proprietário.
8. Crie um convite de 24 horas e 1 uso.
9. Copie o link.
10. Na Conta B, cole o link no navegador.
11. Confirme que a prévia mostra nome, proprietário e quantidade de membros.
12. Aceite o convite.
13. Confirme que a Conta B entra no servidor.
14. Nas duas janelas, confirme que a lista muda sem F5.
15. Tente reutilizar o convite de 1 uso e confirme que ele não aceita outra entrada.
16. Crie um convite novo e revogue.
17. Confirme que o link revogado mostra **Convite indisponível**.
18. Na Conta A, altere nome e descrição.
19. Confirme que a Conta B recebe o novo nome sem F5.
20. Envie um ícone JPG, PNG ou WebP de até 2 MB.
21. Envie um banner de até 5 MB.
22. Confirme que as imagens aparecem nas duas janelas.
23. Na Conta A, abra **Configurações** e transfira a propriedade para a Conta B.
24. Confirme que somente a Conta B passa a acessar as configurações.
25. Na Conta A, saia do servidor.
26. Confirme que o servidor desaparece somente da Conta A.
27. Na Conta B, tente sair e confirme que o proprietário é protegido.
28. Digite o nome atual e exclua o servidor.
29. Confirme que o servidor desaparece da Conta B.

Para testar isolamento com uma Conta C:

1. não use nenhum convite;
2. confirme que o servidor não aparece na lista;
3. tente abrir a URL direta `/app/servidores/{uuid}`;
4. confirme a tela **Servidor indisponível**;
5. use somente um convite válido para obter acesso.

## Validação automatizada

```powershell
npm run validate
```

Com Docker Desktop aberto:

```powershell
npm run supabase:start
npm run supabase:test
npm run supabase:stop
```

`servers_members_rls.test.sql` possui 83 verificações com três usuários, incluindo upload e remoção
de mídia pelo proprietário e recusa para pessoas de fora.
