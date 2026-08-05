export type CryptStartupState = {
  available: boolean;
  enabled: boolean;
  reason?: string;
};

export type WindowsStartupOptions = {
  args: string[];
  enabled: boolean;
  name: string;
  path: string;
};

type LoginItemSettingsSnapshot = {
  executableWillLaunchAtLogin?: boolean;
  openAtLogin: boolean;
};

export const windowsStartupArguments = ['--hidden'] as const;

export function createWindowsStartupOptions(
  packaged: boolean,
  executablePath: string,
): null | WindowsStartupOptions {
  if (!packaged) return null;

  return {
    args: [...windowsStartupArguments],
    enabled: true,
    name: 'Crypt',
    path: executablePath,
  };
}

export function toCryptStartupState(
  packaged: boolean,
  settings?: LoginItemSettingsSnapshot,
): CryptStartupState {
  if (!packaged) {
    return {
      available: false,
      enabled: false,
      reason: 'Disponível somente no Crypt instalado pelo setup do Windows.',
    };
  }

  return {
    available: true,
    enabled: Boolean(settings?.openAtLogin && settings.executableWillLaunchAtLogin !== false),
  };
}
