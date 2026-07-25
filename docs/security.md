# Segurança — Fases 3 e 4

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

## Avatar e Storage

O cliente verifica tipo e 2 MB antes do envio para feedback rápido. A proteção real continua no
bucket e nas políticas de `storage.objects`.

Cada caminho começa pelo UUID da sessão. Uma conta não pode inserir, atualizar ou excluir objetos na
pasta de outra. A constraint de `profiles.avatar_path` fornece uma segunda barreira contra associação
indevida.

Quando um avatar é substituído, o perfil aponta primeiro para o novo arquivo e o anterior é removido
depois. Se a atualização do banco falhar, o upload novo é limpo.

## Spotify

O Crypt aceita somente uma URL de faixa em `open.spotify.com`, remove parâmetros de compartilhamento
e reduz o link ao ID validado da faixa. O iframe é construído diretamente a partir desse ID e usa o
player oficial. O Crypt não baixa, copia, transforma nem hospeda áudio.

## Exclusão de conta

`delete-account` continua validando origem, Publishable key, JWT, senha atual no frontend e a palavra
`EXCLUIR`. A chave administrativa existe somente na Edge Function.

Antes de excluir `auth.users`, a função lista e remove os arquivos da pasta UUID no bucket
`profile-media`. Depois, as relações `on delete cascade` removem perfil, configurações e seleções.
Se a limpeza de mídia falhar, a exclusão é interrompida para não deixar arquivos órfãos.

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
- [ ] Testes pgTAP passam com dois usuários.
