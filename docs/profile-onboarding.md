# Perfil e onboarding

## Fluxo

Depois do primeiro login, `/app` consulta `profile_settings`. Se
`onboarding_completed_at` estiver vazio, a pessoa vai para `/onboarding`.

As nove etapas são:

1. boas-vindas e explicação de opcionalidade;
2. avatar, nome e biografia;
3. música;
4. filmes e séries;
5. jogos;
6. hobbies;
7. autodescrições de personalidade;
8. privacidade;
9. música favorita pelo Spotify.

É possível voltar e pular categorias. Cada avanço salva `onboarding_step`, então fechar o navegador
não perde o ponto atual. A conclusão redireciona para `/app/perfil`.

## Edição posterior

`/app/perfil/editar` reúne:

- apresentação;
- avatar;
- catálogo completo de interesses;
- preferências de privacidade;
- música favorita;
- link para conta e segurança.

O identificador aparece como somente leitura. A alteração de `@` será implementada posteriormente
com limites, histórico e proteção contra abuso.

## Teste manual recomendado

1. entrar com uma conta criada na Fase 3;
2. confirmar redirecionamento automático;
3. preencher duas etapas, fechar o navegador e abrir novamente;
4. confirmar que o progresso continuou;
5. pular pelo menos uma categoria e voltar em outra;
6. concluir com interesses privados;
7. abrir o perfil e confirmar que os chips não aparecem;
8. ativar a visibilidade e confirmar que aparecem;
9. enviar avatar válido e depois remover;
10. tentar arquivo acima de 2 MB e arquivo que não seja imagem;
11. colar link de álbum, que deve ser recusado;
12. salvar link de faixa e testar o player oficial;
13. alterar tudo novamente na página de edição;
14. usar uma segunda conta para confirmar a RLS.

As animações respeitam `prefers-reduced-motion`.
