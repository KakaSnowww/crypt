import { afterEach, describe, expect, it } from 'vitest';
import {
  configureRuntimeDocument,
  isAndroidRuntime,
  isDesktopRuntime,
  isElectronRuntime,
  isNativeRuntime,
} from './platform';

afterEach(() => {
  delete window.cryptDesktop;
  delete document.documentElement.dataset.runtime;
});

describe('detecção do aplicativo desktop', () => {
  it('mantém o runtime web no navegador', () => {
    configureRuntimeDocument();
    expect(isDesktopRuntime()).toBe(false);
    expect(isElectronRuntime()).toBe(false);
    expect(isNativeRuntime()).toBe(false);
    expect(document.documentElement.dataset.runtime).toBe('web');
  });

  it('identifica a ponte segura do Electron', () => {
    window.cryptDesktop = {
      capture: {
        clearSelection: () => Promise.resolve(),
        listSources: () => Promise.resolve([]),
        selectSource: () => Promise.resolve(),
      },
      updates: {
        check: () =>
          Promise.resolve({
            currentVersion: '0.2.0',
            state: 'up-to-date' as const,
          }),
        getState: () =>
          Promise.resolve({
            currentVersion: '0.2.0',
            state: 'up-to-date' as const,
          }),
        onStateChange: () => () => undefined,
        restartAndInstall: () => Promise.resolve(true),
      },
      onDeepLink: () => () => undefined,
    };
    configureRuntimeDocument();
    expect(isDesktopRuntime()).toBe(true);
    expect(isElectronRuntime()).toBe(true);
    expect(isNativeRuntime()).toBe(true);
    expect(document.documentElement.dataset.runtime).toBe('electron');
  });

  it('não confunde o navegador com o runtime Android', () => {
    expect(isAndroidRuntime()).toBe(false);
  });
});
