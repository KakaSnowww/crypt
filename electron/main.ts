import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  Menu,
  net,
  nativeImage,
  protocol,
  screen,
  session,
  shell,
  Tray,
  type DesktopCapturerSource,
} from 'electron';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  defaultWindowState,
  loadWindowState,
  saveWindowState,
  type CryptWindowState,
} from './windowState.js';
import { registerDesktopUpdaterIpc, startDesktopUpdater } from './desktopUpdater.js';
import { startDiscordPresence, stopDiscordPresence } from './discordPresence.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, '..');
const applicationScheme = 'crypt-app';
const developmentServerUrl = process.env.CRYPT_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;
let pendingDeepLink: string | null = null;
let selectedCaptureSourceId: string | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let saveWindowTimer: NodeJS.Timeout | null = null;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

protocol.registerSchemesAsPrivileged([
  {
    privileges: {
      allowServiceWorkers: true,
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
    scheme: applicationScheme,
  },
]);

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const deepLink = commandLine.find(isCryptDeepLink);
    if (deepLink) deliverDeepLink(deepLink);

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    deliverDeepLink(url);
  });

  void app.whenReady().then(async () => {
    app.setAppUserModelId('com.kakasnowww.crypt');
    Menu.setApplicationMenu(null);
    registerCryptProtocol();
    configureApplicationProtocol();
    configureSession();
    registerDesktopIpc();
    registerDesktopUpdaterIpc();
    await createMainWindow();
    createTray();
    startDesktopUpdater();
    startDiscordPresence();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
    });
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  stopDiscordPresence();
  persistMainWindowState();
});

function registerCryptProtocol() {
  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient('crypt', process.execPath, [path.resolve(process.argv[1])]);
    return;
  }

  app.setAsDefaultProtocolClient('crypt');
}

function configureApplicationProtocol() {
  protocol.handle(applicationScheme, (request) => {
    const requestUrl = new URL(request.url);
    const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
    const distributionDirectory = path.join(projectDirectory, 'dist');
    const requestedFile = path.resolve(distributionDirectory, relativePath || 'index.html');
    const isInsideDistribution =
      requestedFile === distributionDirectory ||
      requestedFile.startsWith(`${distributionDirectory}${path.sep}`);
    const resolvedFile =
      isInsideDistribution && existsSync(requestedFile) && statSync(requestedFile).isFile()
        ? requestedFile
        : path.join(distributionDirectory, 'index.html');

    return net.fetch(pathToFileURL(resolvedFile).toString());
  });
}

function configureSession() {
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission) => permission === 'media' || permission === 'notifications',
  );

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media' || permission === 'notifications');
  });

  session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      if (!selectedCaptureSourceId || !request.videoRequested) {
        callback({});
        return;
      }

      void getDesktopSources()
        .then((sources) => {
          const selectedSource = sources.find((source) => source.id === selectedCaptureSourceId);
          selectedCaptureSourceId = null;

          if (!selectedSource) {
            callback({});
            return;
          }

          callback({
            audio: request.audioRequested ? 'loopback' : undefined,
            video: selectedSource,
          });
        })
        .catch(() => {
          selectedCaptureSourceId = null;
          callback({});
        });
    },
    { useSystemPicker: false },
  );
}

function registerDesktopIpc() {
  ipcMain.handle('crypt:list-capture-sources', async () => {
    const sources = await getDesktopSources();
    const displays = screen.getAllDisplays();
    const primaryDisplayId = String(screen.getPrimaryDisplay().id);

    return sources.map((source) => {
      const isMonitor = source.id.startsWith('screen:');
      const display = isMonitor
        ? displays.find((candidate) => String(candidate.id) === source.display_id)
        : undefined;
      const thumbnailSize = source.thumbnail.getSize();

      return {
        height: display?.size.height ?? thumbnailSize.height,
        id: source.id,
        isPrimary: source.display_id === primaryDisplayId,
        kind: isMonitor ? 'monitor' : 'window',
        subtitle: isMonitor
          ? display?.label || `Monitor ${source.display_id}`
          : 'Janela do Windows',
        thumbnailDataUrl: source.thumbnail.toDataURL(),
        title: isMonitor && source.display_id === primaryDisplayId ? 'Tela principal' : source.name,
        width: display?.size.width ?? thumbnailSize.width,
      };
    });
  });

  ipcMain.handle('crypt:select-capture-source', async (_event, sourceId: string) => {
    const sources = await getDesktopSources();
    if (!sources.some((source) => source.id === sourceId)) {
      throw new Error('A tela ou janela escolhida não está mais disponível.');
    }

    selectedCaptureSourceId = sourceId;
  });

  ipcMain.handle('crypt:clear-capture-source', () => {
    selectedCaptureSourceId = null;
  });
}

async function getDesktopSources(): Promise<DesktopCapturerSource[]> {
  const sources = await desktopCapturer.getSources({
    fetchWindowIcons: true,
    thumbnailSize: {
      height: 270,
      width: 480,
    },
    types: ['screen', 'window'],
  });

  return sources.filter(
    (source) => !source.id.startsWith('window:') || source.name.trim().toLowerCase() !== 'crypt',
  );
}

async function createMainWindow() {
  const savedState = getUsableWindowState();
  const window = new BrowserWindow({
    backgroundColor: '#070b16',
    height: savedState.height,
    icon: getApplicationIconPath(),
    minHeight: 640,
    minWidth: 940,
    show: false,
    title: 'Crypt',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(currentDirectory, 'preload.cjs'),
      sandbox: true,
    },
    width: savedState.width,
    x: savedState.x,
    y: savedState.y,
  });

  mainWindow = window;
  if (savedState.maximized) window.maximize();
  window.once('ready-to-show', () => showMainWindow());
  window.on('close', (event) => {
    persistMainWindowState();
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });
  window.on('move', scheduleWindowStateSave);
  window.on('resize', scheduleWindowStateSave);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (
      !url.startsWith(`${applicationScheme}://`) &&
      (!developmentServerUrl || !url.startsWith(developmentServerUrl))
    ) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url);
    }
  });

  if (developmentServerUrl) {
    await window.loadURL(developmentServerUrl);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    await window.loadURL(`${applicationScheme}://app/`);
  }

  if (pendingDeepLink) {
    window.webContents.send('crypt:deep-link', pendingDeepLink);
    pendingDeepLink = null;
  }
}

function deliverDeepLink(url: string) {
  if (!isCryptDeepLink(url)) return;

  if (!mainWindow || mainWindow.webContents.isLoading()) {
    pendingDeepLink = url;
    return;
  }

  mainWindow.webContents.send('crypt:deep-link', url);
}

function isCryptDeepLink(value: string) {
  return value.startsWith('crypt://');
}

function createTray() {
  if (tray) return;

  const icon = nativeImage.createFromPath(getApplicationIconPath());
  tray = new Tray(icon);
  tray.setToolTip('Crypt');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        click: showMainWindow,
        label: 'Abrir Crypt',
      },
      {
        type: 'separator',
      },
      {
        click: () => {
          isQuitting = true;
          app.quit();
        },
        label: 'Sair do Crypt',
      },
    ]),
  );
  tray.on('click', showMainWindow);
  tray.on('double-click', showMainWindow);
}

function showMainWindow() {
  if (!mainWindow) {
    void createMainWindow();
    return;
  }

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function getApplicationIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'crypt.ico')
    : path.join(projectDirectory, 'src-tauri', 'icons', 'icon.ico');
}

function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function getUsableWindowState(): CryptWindowState {
  const savedState = loadWindowState(getWindowStatePath());
  const matchingDisplay = screen.getDisplayMatching(savedState);
  const workArea = matchingDisplay.workArea;
  const hasVisibleArea =
    savedState.x < workArea.x + workArea.width - 80 &&
    savedState.y < workArea.y + workArea.height - 80 &&
    savedState.x + savedState.width > workArea.x + 80 &&
    savedState.y + savedState.height > workArea.y + 80;

  if (hasVisibleArea) return savedState;

  const primaryWorkArea = screen.getPrimaryDisplay().workArea;
  return {
    ...defaultWindowState,
    x: primaryWorkArea.x + Math.max(0, Math.round((primaryWorkArea.width - 1440) / 2)),
    y: primaryWorkArea.y + Math.max(0, Math.round((primaryWorkArea.height - 900) / 2)),
  };
}

function scheduleWindowStateSave() {
  if (saveWindowTimer) clearTimeout(saveWindowTimer);
  saveWindowTimer = setTimeout(persistMainWindowState, 250);
}

function persistMainWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.isMaximized() ? mainWindow.getNormalBounds() : mainWindow.getBounds();
  saveWindowState(getWindowStatePath(), {
    ...bounds,
    maximized: mainWindow.isMaximized(),
  });
}
