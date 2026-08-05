import { describe, expect, it } from 'vitest';
import { createWindowsStartupOptions, toCryptStartupState } from './startupSettings.js';

describe('startupSettings', () => {
  it('não oferece inicialização automática durante o desenvolvimento', () => {
    expect(createWindowsStartupOptions(false, 'C:/Electron/electron.exe')).toBeNull();
    expect(toCryptStartupState(false)).toEqual({
      available: false,
      enabled: false,
      reason: 'Disponível somente no Crypt instalado pelo setup do Windows.',
    });
  });

  it('usa os mesmos argumentos para registrar e consultar o item do Windows', () => {
    expect(createWindowsStartupOptions(true, 'C:/Crypt/CryptMessenger.exe')).toEqual({
      args: ['--hidden'],
      enabled: true,
      name: 'Crypt',
      path: 'C:/Crypt/CryptMessenger.exe',
    });
    expect(
      toCryptStartupState(true, {
        executableWillLaunchAtLogin: true,
        openAtLogin: true,
      }),
    ).toEqual({ available: true, enabled: true });
  });
});
