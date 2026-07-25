# Segurança — Fase 3

## Fronteiras de confiança

O navegador não é considerado confiável. Ele recebe apenas a Project URL e a Publishable key. Toda
autorização de dados acontece no PostgreSQL por privilégios e Row Level Security.

A Secret key ou chave legada `service_role` existe somente no ambiente da Edge Function. Ela ignora
RLS e, por isso, nunca pode aparecer em `.env.local`, no Git ou no bundle do Vite.

## Autenticação

- Supabase Auth armazena e protege as senhas.
- O cliente usa PKCE para callbacks de e-mail.
- A sessão é persistida no navegador e renovada automaticamente.
- A saída remove somente a sessão do dispositivo atual.
- Rotas privadas exigem uma sessão autenticada.
- Destinos pós-login são limitados a `/app` e seus caminhos internos.
- Sessões ausentes ou expiradas voltam ao login.

## Validação

React Hook Form e Zod fornecem feedback imediato, mas não são a barreira final. Nome e identificador
também possuem constraints e validações na migration.

React escapa textos renderizados. Mensagens internas do Supabase são convertidas em mensagens
seguras e previsíveis antes de aparecerem para o usuário.

## Row Level Security

RLS está habilitada e forçada em `profiles`.

- anônimos não leem perfis;
- autenticados leem somente a tabela de campos públicos;
- cada pessoa altera apenas sua própria linha;
- ninguém exclui uma linha diretamente pelo cliente;
- criação acontece exclusivamente pelo gatilho associado a `auth.users`.

## Exclusão de conta

A exclusão utiliza `supabase/functions/delete-account`:

1. o frontend pede a senha atual novamente;
2. o usuário precisa digitar `EXCLUIR`;
3. a função limita origens com `ALLOWED_ORIGINS`;
4. confere a Publishable key recebida;
5. valida o token do usuário com o Supabase Auth;
6. usa a chave administrativa apenas no servidor;
7. exclui exatamente o usuário do token;
8. a chave estrangeira remove o perfil relacionado.

A função é publicada com `--no-verify-jwt` porque as chaves públicas atuais não são verificadas pelo
modo legado do gateway. Isso não torna a função pública: a própria implementação valida a API key e
o JWT antes de qualquer operação administrativa.

## E-mails

O envio padrão do Supabase é apropriado apenas para desenvolvimento e possui limites baixos. Antes
de disponibilizar o Crypt publicamente, será necessário configurar SMTP próprio, templates e o
domínio HTTPS oficial.

## Checklist

- [ ] `.env.local` está ignorado pelo Git.
- [ ] Nenhuma Secret key aparece no frontend.
- [ ] Redirect URLs correspondem exatamente às URLs utilizadas.
- [ ] Confirmação de e-mail está habilitada no projeto hospedado.
- [ ] Migration foi aplicada pela CLI.
- [ ] `ALLOWED_ORIGINS` foi configurado.
- [ ] Edge Function foi publicada.
- [ ] Testes com dois usuários confirmaram o identificador único.
- [ ] Usuário sem sessão não abre `/app`.
- [ ] Exclusão remove o usuário e seu perfil.
