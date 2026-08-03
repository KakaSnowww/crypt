# Fase 20 — experiência, conversas e atualização

## O que mudou

- **Navegação mais direta:** `Conversa Geral` e `Base visual` não aparecem mais na navegação principal. A rota interna da base visual continua disponível apenas para desenvolvimento.
- **Novo início:** servidores, mensagens e conexões são os destinos principais, sem atalhos redundantes.
- **Busca da conversa:** o botão de lupa no cabeçalho abre busca por texto, pessoa e data no canal ou conversa privada atual.
- **Mídias e fixadas:** o mesmo painel reúne anexos do histórico carregado e, nos canais, mensagens fixadas.
- **Histórico longo:** o botão `Carregar mensagens mais antigas` amplia os resultados sem bloquear a conversa.
- **Som configurável:** Conta e segurança ganhou volume geral e controles separados para mensagens, amizades, chamadas e aplicativo.
- **Visual unificado:** login, início, painéis e navegação usam as mesmas superfícies e contrastes no Windows, Android e navegador.
- **Atualização Windows:** depois do download, `Atualizar e reiniciar` fecha o Crypt, aplica o instalador NSIS em modo silencioso e abre o aplicativo novamente.

## Limite consciente da busca

A busca trabalha sobre as páginas de histórico que já chegaram ao aparelho. Para pesquisar mensagens mais antigas, use `Carregar mensagens mais antigas` dentro do próprio painel. Isso mantém as regras de acesso existentes e evita uma consulta pesada no banco.

## Roteiro de validação

1. Abra `/app` e confirme que `Conversa Geral` e `Base visual` não aparecem na barra lateral.
2. Entre em um canal, clique na lupa e procure uma frase por texto, pessoa e data.
3. Abra as abas `Mídias` e `Fixadas`; clique em um resultado e confirme que a mensagem volta ao centro da conversa.
4. Repita a busca dentro de uma mensagem privada ou grupo.
5. Em `Conta e segurança`, altere o volume, desative uma categoria, salve e use `Testar volume`.
6. Redimensione o Windows e teste o login e o início em largura estreita; no Android, teste também com o teclado aberto.
7. Em uma versão instalada anterior, publique uma versão mais nova, aguarde o download e clique em `Atualizar e reiniciar`. O Crypt deve fechar, atualizar sem mostrar o assistente e reabrir.

## Comandos finais

```powershell
npm ci
npm run validate
npm run validate:desktop
npm run validate:android
```

Esta fase não adiciona migration nem Edge Function.
