# Cadastro, confirmação de e-mail e limites

## Rolagem no cadastro e no onboarding

As telas públicas usam um contêiner interno com altura da janela. Assim, somente o conteúdo do
cadastro ou da etapa inicial rola quando ele ultrapassa a área disponível, inclusive com o teclado
aberto no Android.

## Limite de novos cadastros

O bloqueio de envio de e-mails não é criado pelo frontend do Crypt. Ele é aplicado pelo Supabase
Auth. O remetente de testes do Supabase possui uma cota baixa e não é indicado para produção.

Há duas configurações possíveis no painel do projeto:

1. **Produção recomendada:** configurar um SMTP próprio em **Authentication → Emails → SMTP
   Settings** e ajustar **Authentication → Rate Limits** conforme a capacidade do provedor.
2. **Teste sem confirmação:** desativar **Confirm email** em **Authentication → Providers → Email**.
   Nesse modo a conta entra imediatamente, mas o endereço de e-mail não é verificado.

O Crypt impede envios duplicados enquanto o cadastro está em andamento e diferencia, na interface,
o limite de e-mail de outros bloqueios do serviço de autenticação. Não se deve contornar o limite por
uma função pública com credenciais administrativas, pois isso permitiria criação abusiva de contas.
