export {};

declare global {
  type CryptDesktopCaptureSource = {
    height: number;
    id: string;
    isPrimary: boolean;
    kind: 'monitor' | 'window';
    subtitle: string;
    thumbnailDataUrl: string;
    title: string;
    width: number;
  };

  type CryptDesktopStartupState = {
    available: boolean;
    enabled: boolean;
    reason?: string;
  };

  type CryptDesktopUpdateState = {
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

  interface Window {
    cryptDesktop?: {
      capture: {
        clearSelection: () => Promise<void>;
        listSources: () => Promise<CryptDesktopCaptureSource[]>;
        selectSource: (sourceId: string) => Promise<void>;
      };
      onDeepLink: (listener: (url: string) => void) => () => void;
      startup?: {
        get: () => Promise<CryptDesktopStartupState>;
        set: (enabled: boolean) => Promise<CryptDesktopStartupState>;
      };
      updates: {
        check: () => Promise<CryptDesktopUpdateState>;
        getState: () => Promise<CryptDesktopUpdateState>;
        onStateChange: (listener: (state: CryptDesktopUpdateState) => void) => () => void;
        restartAndInstall: () => Promise<boolean>;
      };
    };
  }
}
