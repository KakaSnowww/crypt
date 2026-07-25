# Crypt

O Crypt será uma plataforma social de comunidades, conversas, amizades e descoberta de
pessoas por interesses. A aplicação será disponibilizada no navegador, no Windows e no
Android, mantendo uma identidade própria e uma base segura.

## Estado atual

Fase 1 — preparação do ambiente e criação da base do projeto.

Nesta fase estão configurados:

- React 19 e TypeScript.
- Vite.
- Tailwind CSS.
- ESLint.
- Prettier.
- Vitest e React Testing Library.
- Scripts de validação.
- Estrutura mínima do código.
- Identidade visual inicial em roxo e azul.

## Tecnologias

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- ESLint.
- Prettier.
- Vitest.
- React Testing Library.

Tecnologias que entrarão em fases posteriores:

- Supabase.
- Tauri 2.
- Capacitor 8.
- LiveKit.
- TanStack Query.
- Zustand.
- React Hook Form.
- Zod.

## Pré-requisitos

- Windows 10 ou superior.
- Node.js 24.
- npm 11.
- Git.
- Visual Studio Code.

## Instalação

No PowerShell, acesse a pasta do projeto e instale as dependências:

```powershell
cd C:\Users\Snow\Documents\Crypt
npm ci
```

## Executar em desenvolvimento

```powershell
npm run dev
```

O endereço esperado é:

```text
http://localhost:5173
```

## Validação completa

```powershell
npm run validate
```

Esse comando executa:

1. Verificação do TypeScript.
2. ESLint.
3. Testes automatizados.
4. Verificação de formatação.
5. Build de produção.

## Scripts

| Comando                | Finalidade                              |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Inicia o ambiente de desenvolvimento    |
| `npm run build`        | Gera o build web de produção            |
| `npm run preview`      | Abre uma prévia do build                |
| `npm run typecheck`    | Verifica os tipos TypeScript            |
| `npm run lint`         | Analisa a qualidade do código           |
| `npm run test`         | Executa os testes uma vez               |
| `npm run test:watch`   | Executa os testes em modo de observação |
| `npm run format`       | Formata os arquivos                     |
| `npm run format:check` | Verifica a formatação                   |
| `npm run validate`     | Executa todas as validações             |

## Variáveis de ambiente

Copie `.env.example` para `.env.local` somente quando a configuração do Supabase começar.

Variáveis prefixadas com `VITE_` são incluídas no código entregue ao cliente. Por isso,
segredos administrativos nunca poderão utilizar esse prefixo.

## Estrutura atual

```text
Crypt/
├── public/
│   └── crypt-mark.svg
├── src/
│   ├── test/
│   │   └── setup.ts
│   ├── App.test.tsx
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   └── vite-env.d.ts
├── .env.example
├── .gitattributes
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

As pastas de funcionalidades serão criadas somente quando começarem a ser utilizadas.

## Decisões arquiteturais iniciais

- Aplicação web responsiva como base compartilhada.
- Tauri 2 para o aplicativo Windows.
- Capacitor 8 para o aplicativo Android.
- Supabase para autenticação, banco, Realtime, Storage e funções protegidas.
- LiveKit para voz e vídeo depois que mensagens e permissões estiverem estáveis.
- Datas armazenadas em UTC e apresentadas no fuso do usuário.
- Autorização aplicada no banco com Row Level Security.

## Segurança

- Nenhuma chave administrativa pode ser colocada no frontend.
- A chave `service_role` do Supabase nunca poderá usar o prefixo `VITE_`.
- O segredo do LiveKit será armazenado somente no backend.
- Arquivos `.env` reais não são versionados.
- Todas as tabelas públicas terão RLS quando o banco for criado.

## Plataformas planejadas

- Navegador responsivo.
- Windows por meio do Tauri 2.
- Android por meio do Capacitor 8.

## Limitações conhecidas

- Esta fase ainda não possui autenticação nem banco de dados.
- Tauri e Capacitor ainda não foram adicionados.
- A página atual serve para confirmar que a base visual e as ferramentas funcionam.

## Roadmap

O desenvolvimento seguirá as fases documentadas no prompt mestre do Crypt. A próxima etapa
será a Fase 2, responsável pelo design system, componentes básicos, layouts e navegação.

## Licença

Projeto privado. A licença será definida antes de uma eventual publicação do código-fonte.
