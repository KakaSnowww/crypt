# Crypt

Interface inicial de uma plataforma de comunidades e conversa em tempo real, com identidade visual própria em roxo e azul. O projeto está sendo construído em fases, começando pela fundação web e evoluindo depois para autenticação, banco de dados, recursos sociais e empacotamento multiplataforma.

## Estado atual — Fase 2

Esta fase entrega o design system, a navegação e os layouts responsivos da aplicação:

- identidade visual original em roxo e azul;
- tokens reutilizáveis de cores, espaçamento, bordas e sombras;
- layout principal responsivo para desktop e celular;
- área de autenticação preparada para a próxima fase;
- rotas de aplicativo, login, componentes e página não encontrada;
- componentes reutilizáveis de botão, campo, modal, toast, spinner e skeleton;
- tratamento global e por rota para erros inesperados;
- estados visuais de carregamento, erro, sucesso e aviso;
- dados simulados claramente identificados na interface;
- testes automatizados dos fluxos e componentes principais.

> A autenticação e os dados reais ainda não fazem parte desta fase. Eles serão implementados na Fase 3.

## Tecnologias

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Radix UI Dialog
- Lucide React
- Vitest
- Testing Library
- ESLint
- Prettier

## Requisitos

- Node.js 24 ou superior
- npm 11 ou superior
- Git

## Instalação

No PowerShell, entre na pasta do projeto e instale as dependências exatas do arquivo de lock:

```powershell
cd C:\Users\Snow\Documents\Crypt
npm ci
```

## Executar em desenvolvimento

```powershell
npm run dev
```

Depois, abra:

- `http://localhost:5173/app` — prévia principal do Crypt;
- `http://localhost:5173/app/componentes` — catálogo do design system;
- `http://localhost:5173/login` — prévia da autenticação;
- qualquer endereço inexistente — página 404.

## Validação completa

```powershell
npm run validate
```

Esse comando executa:

1. verificação de formatação;
2. análise estática com ESLint;
3. verificação de tipos do TypeScript;
4. testes automatizados;
5. build de produção.

Também é possível executar cada etapa separadamente:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

## Estrutura principal

```text
src/
├── app/
│   ├── App.tsx
│   ├── AppProviders.tsx
│   ├── ErrorBoundary.tsx
│   └── router.tsx
├── components/
│   └── common/
│       ├── Button.tsx
│       ├── IconButton.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Skeleton.tsx
│       ├── Spinner.tsx
│       ├── ToastContext.ts
│       └── ToastProvider.tsx
├── layouts/
│   ├── AppShell.tsx
│   ├── AuthLayout.tsx
│   └── Brand.tsx
├── lib/
│   └── classNames.ts
├── routes/
│   ├── AppHomeRoute.tsx
│   ├── DesignSystemRoute.tsx
│   ├── LoginRoute.tsx
│   ├── NotFoundRoute.tsx
│   └── RouteErrorFallback.tsx
├── styles/
│   ├── globals.css
│   └── tokens.css
├── test/
│   ├── renderRoute.tsx
│   └── setup.ts
└── main.tsx
```

## Acessibilidade

- navegação completa por teclado nos componentes interativos;
- foco visível;
- rótulos associados aos campos;
- mensagens de erro ligadas aos respectivos campos;
- modal com foco contido e fechamento pela tecla `Esc`;
- redução de animações quando o sistema solicita menos movimento;
- regiões de status para avisos e carregamento.

## Segurança nesta fase

- nenhum segredo ou credencial está incluído no repositório;
- variáveis locais devem usar `.env`, que está ignorado pelo Git;
- `.env.example` documenta apenas nomes seguros de configuração;
- conteúdo digitado na prévia não é enviado nem armazenado;
- dependências ficam fixadas no `package-lock.json`.

### Nota de auditoria

Em 24 de julho de 2026, o `npm audit` passou a sinalizar o alerta
`GHSA-qwww-vcr4-c8h2` no React Router. O próprio aviso informa que ele afeta
somente as APIs instáveis de RSC, que não são usadas neste aplicativo SPA.
Ainda não existe uma versão corrigida disponível no npm para
`react-router-dom`. A dependência deve ser atualizada assim que a correção
compatível for publicada.

## Limitações conhecidas

- login e cadastro são apenas demonstrações visuais;
- mensagens, espaços, canais e membros são dados simulados;
- botões de navegação secundária ainda não executam ações reais;
- não há conexão com Supabase ou outro banco de dados;
- empacotamento desktop e Android ainda não foi adicionado.

## Próxima fase

A Fase 3 adicionará Supabase, autenticação real, sessão persistente e proteção das rotas privadas. Ela só deve começar depois da validação manual desta fase.
