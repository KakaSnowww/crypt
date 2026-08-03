# Fases 21 e 22 — auditoria de segurança e testes finais

Esta entrega unifica a revisão final de segurança e a validação multiplataforma do Crypt 0.8.0.
Ela não adiciona novos segredos nem substitui a confirmação em aparelhos reais.

## Correções aplicadas

- Todas as tabelas públicas do aplicativo passam a usar RLS habilitada e forçada.
- Funções `security definer` usam `search_path` vazio e não ficam executáveis por `public`.
- Mídias de perfil e servidor continuam públicas por decisão de produto; anexos de canal, DM e
  grupo permanecem privados e são entregues por URL assinada.
- Buckets aceitam no máximo 5 MB e rejeitam SVG, HTML e tipos executáveis.
- A emissão de token LiveKit aceita somente ações e UUIDs válidos e fica limitada a doze emissões
  por conta a cada minuto.
- Edge Functions limitam o corpo da requisição, validam origem e comparam segredos sem retorno
  antecipado.
- O Electron aceita permissões somente da interface interna, bloqueia navegação não confiável e
  valida profundamente callbacks e convites `crypt://`.
- A perda de rede mantém a tela aberta e informa que a reconexão será automática.
- `npm run validate` executa uma auditoria estática que impede segredos, keystores e configurações
  inseguras de entrarem no Git.

## Aplicação no projeto remoto

Execute na ordem abaixo dentro de `C:\Users\Snow\Documents\Crypt`:

```powershell
npm ci
npm run supabase:db:push
npm run supabase:functions:deploy
npm run validate
npm run desktop:check
```

A migração nova é `20260803180000_phase21_22_security_hardening.sql`. O deploy das funções atualiza
`delete-account`, `livekit-token` e `push-notifications`.

Com Docker Desktop aberto, a auditoria SQL completa pode ser repetida localmente:

```powershell
npm run supabase:start
npm run supabase:test
npm run supabase:stop
```

## Matriz final de teste

Marque cada linha somente depois do teste real. Use duas contas comuns e uma conta proprietária.

| Área             | Cenário                                   | Resultado esperado                                                         |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| Windows          | Instalar e abrir a versão 0.8.0           | Login, bandeja, atualização e presença funcionam sem aviso de configuração |
| Android real     | Redmi 10C / Android 13                    | Login, permissões, rolagem, segundo plano e links funcionam                |
| Android emulador | Tela pequena e teclado aberto             | Formulários e onboarding continuam roláveis                                |
| Contas           | Proprietário, cargo comum e conta externa | Cada perfil vê e altera somente o que sua permissão permite                |
| Servidores       | Canal negado e URL direta conhecida       | Canal não aparece e a leitura direta é recusada                            |
| Arquivos         | Anexo de canal, DM e grupo                | Somente participantes autorizados recebem URL temporária válida            |
| Histórico        | Conversa longa, busca, mídias e fixados   | Paginação não trava e somente a lista de mensagens rola                    |
| Rede             | Ficar offline e reconectar                | Tela permanece aberta, aviso aparece e os dados voltam sem F5              |
| Chamada          | Áudio, câmera, presença e troca de tela   | Participantes sincronizam e a navegação não desconecta                     |
| Transmissão      | Windows e Android                         | Fonte nativa inicia, encerra e não vaza para outra sala                    |
| Notificações     | DM, menção e amizade com app fechado      | Somente o destinatário recebe e abre a rota correta                        |
| Bloqueio         | Bloquear um contato durante DM/chamada    | Novas mensagens e tokens são recusados                                     |
| Moderação        | Banir membro e invalidar convite          | Acesso, reentrada e conteúdo privado permanecem bloqueados                 |
| Atualização      | Publicar versão superior                  | Windows fecha/aplica/reabre e Android baixa o APK oficial                  |

## Critério de conclusão

A fase só deve receber a tag `v0.8.0` quando `npm run validate` e `npm run desktop:check` passarem,
a migração estiver igual em Local e Remote e a matriz acima for confirmada no Windows e no Android.
Falhas reais devem ser corrigidas antes da tag; não aumente apenas o tempo limite de um teste para
ocultar instabilidade.

## Dependências de produção

O projeto usa `react-router-dom` 7.18.2. Em 3 de agosto de 2026, o `npm audit --omit=dev` ainda
classifica como alta uma falha no modo RSC/Server Actions do React Router. O Crypt é uma SPA Vite,
não habilita RSC, não expõe Server Actions e, portanto, não possui o caminho vulnerável em execução.
A versão foi mantida na correção mais recente disponível e deve ser atualizada assim que o pacote
publicar uma versão posterior compatível. Não use `npm audit fix --force`, pois o próprio npm propõe
um downgrade com outras vulnerabilidades conhecidas.
