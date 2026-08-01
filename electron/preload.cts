import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('cryptDesktop', {
  capture: {
    clearSelection: () => ipcRenderer.invoke('crypt:clear-capture-source'),
    listSources: () => ipcRenderer.invoke('crypt:list-capture-sources'),
    selectSource: (sourceId: string) => ipcRenderer.invoke('crypt:select-capture-source', sourceId),
  },
  onDeepLink: (listener: (url: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, url: string) => listener(url);
    ipcRenderer.on('crypt:deep-link', handler);
    return () => ipcRenderer.removeListener('crypt:deep-link', handler);
  },
  updates: {
    check: () => ipcRenderer.invoke('crypt:update:check'),
    getState: () => ipcRenderer.invoke('crypt:update:get-state'),
    onStateChange: (listener: (state: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: unknown) => listener(state);
      ipcRenderer.on('crypt:update-state', handler);
      return () => ipcRenderer.removeListener('crypt:update-state', handler);
    },
    restartAndInstall: () => ipcRenderer.invoke('crypt:update:restart'),
  },
});
