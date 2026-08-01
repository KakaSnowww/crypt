import { app, BrowserWindow, ipcMain } from 'electron';
import electronUpdater, { type ProgressInfo, type UpdateInfo } from 'electron-updater';

const { autoUpdater } = electronUpdater;

export type DesktopUpdateState = {
  currentVersion: string;
  message?: string;
  percent?: number;
  releaseName?: string;
  releaseNotes?: string;
  state:
    | 'available'
    | 'checking'
    | 'disabled'
    | 'downloading'
    | 'error'
    | 'idle'
    | 'ready'
    | 'up-to-date';
  version?: string;
};

const updateStateChannel = 'crypt:update-state';
const updateCheckIntervalMs = 4 * 60 * 60 * 1_000;
let initialized = false;
let currentState: DesktopUpdateState = {
  currentVersion: app.getVersion(),
  state: 'idle',
};

export function registerDesktopUpdaterIpc() {
  ipcMain.handle('crypt:update:get-state', () => currentState);
  ipcMain.handle('crypt:update:check', () => checkForDesktopUpdate(true));
  ipcMain.handle('crypt:update:restart', () => {
    if (currentState.state !== 'ready') return false;
    autoUpdater.quitAndInstall(false, true);
    return true;
  });
}

export function startDesktopUpdater() {
  if (initialized) return;
  initialized = true;

  if (!app.isPackaged || process.platform !== 'win32') {
    setState({
      message: app.isPackaged
        ? 'As atualizações automáticas desta versão estão disponíveis no Windows.'
        : 'O modo de desenvolvimento não consulta versões publicadas.',
      state: 'disabled',
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => setState({ state: 'checking' }));
  autoUpdater.on('update-available', (info: UpdateInfo) =>
    setState({ ...readReleaseDetails(info), state: 'available', version: info.version }),
  );
  autoUpdater.on('update-not-available', (info: UpdateInfo) =>
    setState({ ...readReleaseDetails(info), state: 'up-to-date', version: info.version }),
  );
  autoUpdater.on('download-progress', (progress: ProgressInfo) =>
    setState({
      percent: Math.max(0, Math.min(100, Math.round(progress.percent))),
      releaseName: currentState.releaseName,
      releaseNotes: currentState.releaseNotes,
      state: 'downloading',
      version: currentState.version,
    }),
  );
  autoUpdater.on('update-downloaded', (info: UpdateInfo) =>
    setState({ ...readReleaseDetails(info), state: 'ready', version: info.version }),
  );
  autoUpdater.on('error', (error: Error) =>
    setState({
      message: friendlyUpdateError(error),
      state: 'error',
      version: currentState.version,
    }),
  );

  const initialCheck = setTimeout(() => void checkForDesktopUpdate(false), 5_000);
  initialCheck.unref();
  const interval = setInterval(() => void checkForDesktopUpdate(false), updateCheckIntervalMs);
  interval.unref();
}

function readReleaseDetails(info: UpdateInfo) {
  return {
    releaseName: typeof info.releaseName === 'string' ? info.releaseName : undefined,
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
  };
}

function normalizeReleaseNotes(releaseNotes: UpdateInfo['releaseNotes']) {
  if (typeof releaseNotes === 'string') return releaseNotes.trim() || undefined;
  if (!Array.isArray(releaseNotes)) return undefined;

  const notes = releaseNotes
    .map((entry) => (typeof entry.note === 'string' ? entry.note.trim() : ''))
    .filter(Boolean)
    .join('\n\n');
  return notes || undefined;
}

async function checkForDesktopUpdate(manual: boolean) {
  if (!app.isPackaged || process.platform !== 'win32') {
    setState({
      message: 'A verificação real funciona somente no aplicativo Windows instalado.',
      state: 'disabled',
    });
    return currentState;
  }

  if (currentState.state === 'downloading' || currentState.state === 'ready') return currentState;

  if (manual) setState({ state: 'checking' });

  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setState({
      message: friendlyUpdateError(error),
      state: 'error',
      version: currentState.version,
    });
  }

  return currentState;
}

function setState(next: Omit<DesktopUpdateState, 'currentVersion'>) {
  currentState = {
    currentVersion: app.getVersion(),
    ...next,
  };

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(updateStateChannel, currentState);
  }
}

function friendlyUpdateError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/404|latest\.yml|release/i.test(message)) {
    return 'Ainda não existe uma versão pública mais recente no GitHub Releases.';
  }
  if (/network|internet|ENOTFOUND|ECONN/i.test(message)) {
    return 'Não foi possível consultar atualizações. Verifique sua conexão com a internet.';
  }
  return 'Não foi possível verificar atualizações agora. Tente novamente mais tarde.';
}
