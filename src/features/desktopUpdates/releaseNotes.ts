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
