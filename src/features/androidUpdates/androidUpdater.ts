import { registerPlugin } from '@capacitor/core';

const repositoryApiUrl = 'https://api.github.com/repos/KakaSnowww/crypt/releases/latest';

export type AndroidRelease = {
  apkUrl: string;
  name: string;
  notes?: string;
  version: string;
};

export type AndroidUpdateStatus =
  'available' | 'checking' | 'disabled' | 'downloading' | 'error' | 'idle' | 'ready' | 'up-to-date';

export type AndroidUpdateState = {
  currentVersion: string;
  message?: string;
  percent?: number;
  release?: AndroidRelease;
  state: AndroidUpdateStatus;
};

type DownloadStatus = {
  percent: number;
  reason?: number;
  status: 'error' | 'missing' | 'paused' | 'pending' | 'ready' | 'running';
  version?: string;
};

type InstallResult = {
  openedInstaller: boolean;
  requiresPermission: boolean;
};

type CryptUpdaterPlugin = {
  downloadUpdate(options: { url: string; version: string }): Promise<{ downloadId: string }>;
  getCurrentVersion(): Promise<{ version: string }>;
  getDownloadStatus(): Promise<DownloadStatus>;
  installUpdate(): Promise<InstallResult>;
  requestInstallPermission(): Promise<{ granted: boolean; openedSettings: boolean }>;
};

type GitHubAsset = {
  browser_download_url?: unknown;
  name?: unknown;
};

type GitHubRelease = {
  assets?: unknown;
  body?: unknown;
  draft?: unknown;
  name?: unknown;
  prerelease?: unknown;
  tag_name?: unknown;
};

export const cryptUpdater = registerPlugin<CryptUpdaterPlugin>('CryptUpdater');

export async function fetchLatestAndroidRelease(
  fetcher: typeof fetch = fetch,
): Promise<AndroidRelease> {
  const response = await fetcher(repositoryApiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? 'O GitHub limitou temporariamente as verificações. Tente novamente mais tarde.'
        : 'Não foi possível consultar a versão mais recente no GitHub.',
    );
  }

  return parseAndroidRelease(await response.json());
}

export function parseAndroidRelease(value: unknown): AndroidRelease {
  if (!value || typeof value !== 'object') {
    throw new Error('O GitHub retornou dados de versão inválidos.');
  }

  const release = value as GitHubRelease;
  if (release.draft === true || release.prerelease === true) {
    throw new Error('A versão mais recente ainda não é uma versão pública estável.');
  }

  const version = normalizeVersion(release.tag_name);
  const assets = Array.isArray(release.assets) ? (release.assets as GitHubAsset[]) : [];
  const expectedName = `Crypt-Android-${version}.apk`;
  const apk = assets.find(
    (asset) =>
      asset.name === expectedName &&
      typeof asset.browser_download_url === 'string' &&
      isOfficialApkUrl(asset.browser_download_url),
  );

  if (!apk || typeof apk.browser_download_url !== 'string') {
    throw new Error(`A Release v${version} ainda não contém o APK oficial do Android.`);
  }

  return {
    apkUrl: apk.browser_download_url,
    name:
      typeof release.name === 'string' && release.name.trim()
        ? release.name.trim()
        : `Crypt v${version}`,
    notes: typeof release.body === 'string' ? release.body : undefined,
    version,
  };
}

export function isNewerVersion(candidate: string, current: string) {
  const candidateParts = versionParts(candidate);
  const currentParts = versionParts(current);

  for (let index = 0; index < 3; index += 1) {
    if (candidateParts[index] > currentParts[index]) return true;
    if (candidateParts[index] < currentParts[index]) return false;
  }

  return false;
}

function isOfficialApkUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'github.com' &&
      parsed.pathname.toLowerCase().startsWith('/kakasnowww/crypt/releases/download/') &&
      parsed.pathname.toLowerCase().endsWith('.apk')
    );
  } catch {
    return false;
  }
}

function normalizeVersion(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('A Release não informa uma versão válida.');
  }

  const version = value.trim().replace(/^v/i, '');
  versionParts(version);
  return version;
}

function versionParts(version: string) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Versão inválida: ${version}`);
  }

  return version.split('.').map(Number) as [number, number, number];
}
