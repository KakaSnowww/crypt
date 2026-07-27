# Moderação e configurações — Fase 10

## Escopo

A Fase 10 adiciona ao servidor:

- expulsão de membros sem impedir um retorno por convite;
- banimento com bloqueio de novos convites;
- remoção de banimentos;
- denúncias privadas entre membros do mesmo servidor;
- caixa administrativa para resolver ou arquivar denúncias;
- trilha de auditoria imutável para o cliente;
- preferências de denúncias, motivo obrigatório e notificações futuras.

As configurações básicas, transferência e exclusão do servidor continuam na página de configurações.
Senha, e-mail, sessões e exclusão da conta continuam na área de segurança da conta.

## Permissões e hierarquia

O dono sempre pode moderar membros e nunca pode ser expulso ou banido. Um cargo com
`Gerenciar membros` somente age sobre pessoas cuja posição máxima seja inferior à sua. A decisão
acontece no banco por `can_moderate_server_member`; ocultar um botão não é usado como autorização.

Um banimento remove a associação atual do membro e mantém `server_bans` como barreira de entrada.
Remover o ban não reinsere a pessoa: ela ainda precisa usar um convite válido.

## Denúncias

Qualquer membro pode denunciar outro membro do mesmo servidor quando a preferência está ativa. A
denúncia não fica visível ao denunciado nem pode ser consultada diretamente pelo cliente. O banco
limita denúncias repetidas equivalentes no mesmo dia.

Moderadores podem marcar uma denúncia como resolvida ou arquivada. O histórico é preservado e a
ação gera uma entrada na auditoria.

## Auditoria

`server_audit_logs` registra:

- expulsões;
- banimentos;
- remoções de ban;
- resolução de denúncias;
- mudanças nas preferências de moderação.

As tabelas administrativas não concedem escrita direta a `authenticated`. Todas as alterações
passam por RPCs `security definer`, e o cliente não pode inserir, editar ou apagar auditoria.

## Teste manual com três contas

1. O dono abre **Moderação** e salva as preferências.
2. O dono cria um cargo com `Gerenciar membros` e atribui à segunda conta.
3. A terceira conta denuncia a segunda na lista de membros.
4. A segunda conta abre a caixa de denúncias e resolve o registro.
5. Confirme a entrada correspondente em Auditoria.
6. A segunda conta expulsa a terceira; a terceira perde o acesso.
7. A terceira retorna com convite.
8. A segunda conta bane a terceira com motivo; o convite passa a ser recusado.
9. A segunda conta remove o ban; a terceira consegue entrar novamente por convite.
10. Confirme que a segunda conta não consegue moderar o dono.
11. Confirme que a terceira conta não abre a URL de moderação diretamente.
