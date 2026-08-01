import { Capacitor } from '@capacitor/core';

export function isElectronRuntime() {
  return typeof window !== 'undefined' && Boolean(window.cryptDesktop);
}

export function isAndroidRuntime() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isDesktopRuntime() {
  return isElectronRuntime();
}

export function isNativeRuntime() {
  return isElectronRuntime() || isAndroidRuntime();
}

export function configureRuntimeDocument() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.runtime = isElectronRuntime()
    ? 'electron'
    : isAndroidRuntime()
      ? 'android'
      : 'web';
}
