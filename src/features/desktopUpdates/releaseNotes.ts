import packageMetadata from '../../../package.json';

export type CryptRelease = {
  highlights: Array<{
    description: string;
    title: string;
  }>;
  summary: string;
  title: string;
  version: string;
};

export type PendingCryptRelease = {
  releaseName?: string;
  releaseNotes?: string;
  version: string;
};

export const pendingReleaseStorageKey = 'crypt:pending-release';
export const seenReleaseStorageKey = 'crypt:last-seen-release';
export const updateSoundStorageKey = 'crypt:last-update-sound';

const bundledReleases: Record<string, CryptRelease> = {
  '0.8.0': {
    highlights: [
      {
        description:
          'Tabelas, arquivos privados e funções administrativas receberam uma auditoria final de isolamento e privilégios.',
        title: 'Dados mais protegidos',
      },
      {
        description:
          'Links, permissões, navegação externa e conteúdo interno do aplicativo Windows agora respeitam limites mais rígidos.',
        title: 'Electron reforçado',
      },
      {
        description:
          'A emissão de tokens de chamada ganhou limite por conta e as funções de borda rejeitam origens, ações e cargas inválidas.',
        title: 'Chamadas protegidas contra abuso',
      },
      {
        description:
          'O Crypt preserva a tela durante quedas de internet, reconecta automaticamente e inclui uma matriz final de testes Windows e Android.',
        title: 'Mais estabilidade',
      },
    ],
    summary:
      'As Fases 21 e 22 foram unificadas em uma auditoria de segurança e estabilidade com testes finais multiplataforma.',
    title: 'Segurança e estabilidade até o último detalhe',
    version: '0.8.0',
  },
  '0.7.0': {
    highlights: [
      {
        description:
          'A navegação principal ficou mais direta e não exibe mais Conversa Geral nem Base visual entre os destinos do dia a dia.',
        title: 'Menos distrações',
      },
      {
        description:
          'Canais e mensagens privadas agora reúnem busca por texto, pessoa e data, galeria de mídias e acesso às mensagens fixadas.',
        title: 'Encontre qualquer conversa',
      },
      {
        description:
          'A identidade visual foi refinada em login, início, painéis e navegação para funcionar melhor no Windows e no Android.',
        title: 'Visual mais claro e consistente',
      },
      {
        description:
          'No Windows, o Crypt fecha, aplica a nova versão silenciosamente e reabre; os sons também ganharam volume e categorias configuráveis.',
        title: 'Atualização e som sob controle',
      },
    ],
    summary:
      'A Fase 20 simplifica a navegação, moderniza a interface e adiciona ferramentas para encontrar mensagens, mídias e fixados.',
    title: 'Um Crypt mais simples de usar',
    version: '0.7.0',
  },
  '0.6.0': {
    highlights: [
      {
        description:
          'Escolha entre novos visuais Oceano, Pôr do sol e Esmeralda, além dos efeitos que já existiam.',
        title: 'Mais cores no perfil',
      },
      {
        description:
          'Avatar, banner, ícone e banner de servidor aceitam GIF; as conversas continuam reproduzindo GIF enviado como anexo.',
        title: 'GIF no Crypt',
      },
      {
        description:
          'Posicione fotos horizontal e verticalmente antes de salvar avatar, banner ou mídia do servidor.',
        title: 'Enquadramento sob controle',
      },
      {
        description:
          'Mensagens, amizade, entrada, saída e atualização agora usam um volume mais confortável e equilibrado.',
        title: 'Sons mais suaves',
      },
    ],
    summary:
      'A Fase 19 reúne personalização visual, GIFs, enquadramento de imagens e uma nova mixagem dos sons.',
    title: 'Seu Crypt, do seu jeito',
    version: '0.6.0',
  },
  '0.5.1': {
    highlights: [
      {
        description:
          'Cadastro, confirmação e etapas iniciais agora rolam corretamente em telas menores e com o teclado do Android aberto.',
        title: 'Cadastro sem conteúdo preso',
      },
      {
        description:
          'Ao avançar no perfil inicial, a nova etapa volta ao topo do próprio conteúdo em vez de movimentar a janela inteira.',
        title: 'Onboarding mais confortável',
      },
      {
        description:
          'O Crypt diferencia o limite de envio de confirmação dos demais erros de autenticação e evita instruções enganosas.',
        title: 'Erros de cadastro claros',
      },
      {
        description:
          'A correção mantém o mesmo comportamento responsivo no navegador, aplicativo Windows e Android.',
        title: 'Correção multiplataforma',
      },
    ],
    summary:
      'A versão 0.5.1 corrige a rolagem do cadastro e do onboarding e esclarece limites do serviço de autenticação.',
    title: 'Cadastro mais fluido no Crypt',
    version: '0.5.1',
  },
  '0.5.0': {
    highlights: [
      {
        description:
          'Crie espaços privados com nome, imagem e até dez participantes escolhidos entre seus amigos.',
        title: 'Grupos privados',
      },
      {
        description:
          'Mensagens, anexos, respostas, reações, digitação e contadores são atualizados para todos em tempo real.',
        title: 'Conversa completa',
      },
      {
        description:
          'Inicie áudio e vídeo na conversa individual ou no grupo e continue conectado enquanto navega pelo Crypt.',
        title: 'Chamadas entre amigos',
      },
      {
        description:
          'Administração, participantes, imagens e tokens de chamada são protegidos por regras específicas no banco.',
        title: 'Privacidade preservada',
      },
    ],
    summary:
      'A Fase 18 adiciona grupos privados completos e chamadas dentro das mensagens entre amigos.',
    title: 'Seus grupos chegaram ao Crypt',
    version: '0.5.0',
  },
  '0.4.0': {
    highlights: [
      {
        description:
          'O Crypt consulta o GitHub Releases e mostra uma nova versão diretamente no cabeçalho e nas configurações.',
        title: 'Atualizações visíveis',
      },
      {
        description:
          'O APK é baixado pelo gerenciador nativo do Android com progresso e armazenamento privado do aplicativo.',
        title: 'Download nativo e protegido',
      },
      {
        description:
          'A instalação usa a confirmação oficial do Android e preserva a conta, as conversas e as preferências.',
        title: 'Instalação segura',
      },
      {
        description:
          'APK e AAB assinados podem ser gerados e publicados automaticamente a partir de uma tag no GitHub.',
        title: 'Release reproduzível',
      },
    ],
    summary:
      'A Fase 17 entrega distribuição assinada e atualização integrada para o aplicativo Android.',
    title: 'O Crypt agora se atualiza no Android',
    version: '0.4.0',
  },
  '0.3.0': {
    highlights: [
      {
        description:
          'Mensagens privadas, menções, amizades e avisos de moderação chegam ao Android mesmo com o Crypt encerrado.',
        title: 'Push em segundo plano',
      },
      {
        description:
          'Ao tocar no aviso, o Crypt abre diretamente a conversa, o canal ou a atividade correspondente.',
        title: 'Abertura no lugar certo',
      },
      {
        description:
          'Cada instalação registra um token privado e o remove no logout, sem expor destinos entre contas.',
        title: 'Dispositivos protegidos',
      },
      {
        description:
          'Preferências existentes continuam controlando categorias, sistema e som, evitando alertas duplicados.',
        title: 'Suas preferências respeitadas',
      },
    ],
    summary:
      'A Fase 16 leva a central de notificações do Crypt ao Android por Firebase Cloud Messaging.',
    title: 'O Crypt avisa mesmo quando está fechado',
    version: '0.3.0',
  },
  '0.2.6': {
    highlights: [
      {
        description:
          'O som5.mp3 agora toca sempre que o aplicativo Windows inicia, mesmo quando não existe atualização disponível.',
        title: 'Som em toda inicialização',
      },
      {
        description:
          'Restaurar pela bandeja, minimizar ou clicar novamente no atalho não repete o som durante a mesma execução.',
        title: 'Som apenas na primeira abertura',
      },
      {
        description:
          'Ao sair completamente e iniciar um novo processo do Crypt, o som volta a tocar uma única vez.',
        title: 'Uma reprodução por execução',
      },
      {
        description:
          'A correção de streaming do protocolo crypt-app continua protegida por testes automatizados.',
        title: 'Streaming mantido',
      },
    ],
    summary: 'Esta versão transforma o som5.mp3 no som de abertura oficial do Crypt para Windows.',
    title: 'O Crypt agora recebe você com som',
    version: '0.2.6',
  },
  '0.2.5': {
    highlights: [
      {
        description:
          'O protocolo interno crypt-app agora declara suporte a streaming de mídia, como exigido pelo Electron.',
        title: 'Áudio liberado no aplicativo instalado',
      },
      {
        description:
          'O som5.mp3 pode ser carregado pelo elemento de áudio sem ser interrompido antes de chegar ao mixer do Windows.',
        title: 'Reprodução no executável',
      },
      {
        description:
          'Um teste automatizado protege a configuração stream: true contra alterações futuras.',
        title: 'Proteção contra regressão',
      },
      {
        description:
          'O botão de teste continua disponível em Conta e segurança para validar a saída de som instalada.',
        title: 'Diagnóstico acessível',
      },
    ],
    summary:
      'Esta versão corrige o carregamento de áudio no protocolo utilizado pelo Crypt instalado.',
    title: 'Áudio corrigido no Windows',
    version: '0.2.5',
  },
  '0.2.4': {
    highlights: [
      {
        description:
          'O som5.mp3 agora faz parte do pacote entregue e pode ser testado antes de publicar uma nova versão.',
        title: 'Som incluído e verificável',
      },
      {
        description:
          'Conta e segurança ganhou o botão Testar som de atualização com uma confirmação clara do resultado.',
        title: 'Teste de áudio nas configurações',
      },
      {
        description:
          'O endereço do áudio agora é resolvido especificamente para o ambiente atual, inclusive no protocolo do aplicativo instalado.',
        title: 'Carregamento mais robusto',
      },
      {
        description:
          'O Electron instalado já inicia com a política de áudio necessária para avisos automáticos.',
        title: 'Pronto para avisar na abertura',
      },
    ],
    summary:
      'Esta versão permite confirmar o som localmente e fecha o ciclo de teste da atualização automática.',
    title: 'Som de atualização confirmado',
    version: '0.2.4',
  },
  '0.2.3': {
    highlights: [
      {
        description:
          'A versão 0.2.2 agora detecta esta atualização e exibe o atalho ao lado da pesquisa e das notificações.',
        title: 'Botão testado em atualização real',
      },
      {
        description:
          'A reprodução de som no Electron foi reforçada para funcionar mesmo quando a atualização é encontrada logo após abrir o Crypt.',
        title: 'Aviso sonoro mais confiável',
      },
      {
        description:
          'Se o Windows impedir o primeiro toque, o Crypt libera uma nova tentativa em vez de marcar o aviso como reproduzido.',
        title: 'Tentativa segura do som5',
      },
      {
        description:
          'O popup confirma que a instalação terminou e registra as mudanças desta versão.',
        title: 'Novidades da versão 0.2.3',
      },
    ],
    summary:
      'Esta atualização permite validar o botão, o som5.mp3 e o popup no fluxo automático completo.',
    title: 'Atualizações mais visíveis e audíveis',
    version: '0.2.3',
  },
  '0.2.2': {
    highlights: [
      {
        description:
          'Um novo botão no cabeçalho acompanha o download e permite instalar quando estiver pronto.',
        title: 'Atualização sempre visível',
      },
      {
        description:
          'O som5.mp3 avisa uma única vez quando uma nova versão é encontrada para este dispositivo.',
        title: 'Som de nova versão',
      },
      {
        description:
          'Depois de atualizar, o Crypt apresenta um resumo organizado com as principais mudanças.',
        title: 'Popup de novidades',
      },
      {
        description:
          'A publicação do instalador, blockmap e latest.yml agora é verificada antes do workflow terminar.',
        title: 'Entrega mais confiável',
      },
    ],
    summary:
      'Esta versão deixa o processo de atualização mais claro, audível e fácil de acompanhar.',
    title: 'Uma atualização mais próxima de você',
    version: '0.2.2',
  },
};

export function getCurrentCryptRelease() {
  return bundledReleases[packageMetadata.version] ?? null;
}

export function readPendingCryptRelease(storage: Storage) {
  const serialized = storage.getItem(pendingReleaseStorageKey);
  if (!serialized) return null;

  try {
    const parsed = JSON.parse(serialized) as Partial<PendingCryptRelease>;
    if (typeof parsed.version !== 'string') return null;
    return {
      releaseName: typeof parsed.releaseName === 'string' ? parsed.releaseName : undefined,
      releaseNotes: typeof parsed.releaseNotes === 'string' ? parsed.releaseNotes : undefined,
      version: parsed.version,
    } satisfies PendingCryptRelease;
  } catch {
    return null;
  }
}

export function writePendingCryptRelease(storage: Storage, release: PendingCryptRelease) {
  storage.setItem(pendingReleaseStorageKey, JSON.stringify(release));
}

export function releaseNoteLines(releaseNotes?: string) {
  if (!releaseNotes) return [];

  return releaseNotes
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*#]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}
