import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import packageMetadata from '../../../package.json';
import { isAndroidRuntime } from '../../lib/platform';
import { writePendingCryptRelease } from '../desktopUpdates/releaseNotes';
import { AndroidUpdateContext } from './AndroidUpdateContext';
import {
  cryptUpdater,
  fetchLatestAndroidRelease,
  isNewerVersion,
  type AndroidRelease,
  type AndroidUpdateState,
} from './androidUpdater';

const automaticCheckInterval = 4 * 60 * 60 * 1000;
const lastCheckStorageKey = 'crypt:android-update-last-check';

export function AndroidUpdateProvider({ children }: PropsWithChildren) {
  const androidRuntime = isAndroidRuntime();
  const [state, setState] = useState<AndroidUpdateState>({
    currentVersion: packageMetadata.version,
    state: androidRuntime ? 'idle' : 'disabled',
  });
  const releaseRef = useRef<AndroidRelease | undefined>(undefined);
  const checkingRef = useRef(false);

  const check = useCallback(async () => {
    if (!androidRuntime || checkingRef.current) return;
    checkingRef.current = true;
    setState((current) => ({ ...current, message: undefined, state: 'checking' }));

    try {
      const [{ version: currentVersion }, release] = await Promise.all([
        cryptUpdater.getCurrentVersion(),
        fetchLatestAndroidRelease(),
      ]);
      releaseRef.current = release;
      window.localStorage.setItem(lastCheckStorageKey, Date.now().toString());
      setState({
        currentVersion,
        release,
        state: isNewerVersion(release.version, currentVersion) ? 'available' : 'up-to-date',
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        message:
          error instanceof Error ? error.message : 'Não foi possível verificar atualizações.',
        state: 'error',
      }));
    } finally {
      checkingRef.current = false;
    }
  }, [androidRuntime]);

  const refreshDownloadStatus = useCallback(async () => {
    if (!androidRuntime) return;

    try {
      const download = await cryptUpdater.getDownloadStatus();
      if (!['pending', 'running', 'paused', 'ready', 'error'].includes(download.status)) return;

      setState((current) => {
        if (download.version && current.release?.version !== download.version) return current;
        if (download.status === 'ready') {
          return { ...current, percent: 100, state: 'ready' };
        }
        if (download.status === 'error') {
          return {
            ...current,
            message: `O Android interrompeu o download${download.reason ? ` (código ${download.reason})` : ''}.`,
            state: 'error',
          };
        }
        return { ...current, percent: download.percent, state: 'downloading' };
      });
    } catch {
      setState((current) => ({
        ...current,
        message: 'Não foi possível acompanhar o download da atualização.',
        state: 'error',
      }));
    }
  }, [androidRuntime]);

  const download = useCallback(async () => {
    const release = releaseRef.current ?? state.release;
    if (!androidRuntime || !release) return;

    try {
      await cryptUpdater.downloadUpdate({ url: release.apkUrl, version: release.version });
      setState((current) => ({ ...current, message: undefined, percent: 0, state: 'downloading' }));
    } catch (error) {
      setState((current) => ({
        ...current,
        message: error instanceof Error ? error.message : 'Não foi possível iniciar o download.',
        state: 'error',
      }));
    }
  }, [androidRuntime, state.release]);

  const install = useCallback(async () => {
    const release = releaseRef.current ?? state.release;
    if (!androidRuntime || !release) return;

    try {
      writePendingCryptRelease(window.localStorage, {
        releaseName: release.name,
        releaseNotes: release.notes,
        version: release.version,
      });
      const result = await cryptUpdater.installUpdate();
      if (result.requiresPermission) {
        await cryptUpdater.requestInstallPermission();
        setState((current) => ({
          ...current,
          message:
            'Permita que o Crypt instale atualizações e depois volte para tocar em Instalar novamente.',
        }));
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        message: error instanceof Error ? error.message : 'Não foi possível abrir o instalador.',
        state: 'error',
      }));
    }
  }, [androidRuntime, state.release]);

  useEffect(() => {
    if (!androidRuntime) return;
    const lastCheck = Number(window.localStorage.getItem(lastCheckStorageKey) ?? 0);
    if (!Number.isFinite(lastCheck) || Date.now() - lastCheck >= automaticCheckInterval) {
      void check();
    }
    const timer = window.setInterval(() => void check(), automaticCheckInterval);
    return () => window.clearInterval(timer);
  }, [androidRuntime, check]);

  useEffect(() => {
    if (!androidRuntime || state.state !== 'downloading') return;
    void refreshDownloadStatus();
    const timer = window.setInterval(() => void refreshDownloadStatus(), 1000);
    return () => window.clearInterval(timer);
  }, [androidRuntime, refreshDownloadStatus, state.state]);

  const value = useMemo(
    () => ({ check, download, install, state }),
    [check, download, install, state],
  );

  return <AndroidUpdateContext.Provider value={value}>{children}</AndroidUpdateContext.Provider>;
}
