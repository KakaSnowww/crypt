# Login Gamer/Dev V1

Primeira etapa da nova identidade visual do Crypt, sem grimórios, magia, runas ou elementos arcanos.

## Direção visual

- preto, roxo e ciano elétrico;
- interface voltada a gamers e programadores;
- janela de rede em perspectiva;
- nós de comunidade e fluxo de dados animado;
- terminal com código e indicadores de conexão;
- formulário com acabamento profissional;
- movimento adaptado para quem usa redução de animações.

Esta atualização não altera autenticação, banco, Supabase, pagamentos ou dependências.

## Antes de instalar

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
git status --short
```

Se aparecer qualquer alteração, preserve-a antes de extrair o pacote. Revise os caminhos e faça um commit apenas dos arquivos que pertencem ao seu trabalho atual. Se tiver dúvida, envie a saída de `git status --short` antes de continuar.

## Instalação

```powershell
Expand-Archive `
  -Path "$env:USERPROFILE\Downloads\crypt-login-gamer-dev-v1.zip" `
  -DestinationPath "C:\Users\Snow\Documents\Crypt" `
  -Force
```

## Validação

```powershell
Set-Location "C:\Users\Snow\Documents\Crypt"
npm ci
npm run validate
npm run desktop:check
npm run android:sync
git diff --check
```

## Visualização

```powershell
npm run dev
```

Desktop:

```powershell
npm run desktop:dev
```

Antes de publicar uma tag, homologue o login em tela grande, notebook e celular.
