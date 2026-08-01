import { useCallback, useEffect, useState } from 'react';
import { isElectronRuntime } from '../../lib/platform';

export function useDesktopUpdates() {
  const desktopRuntime = isElectronRuntime();
  const [state, setState] = useState<CryptDesktopUpdateState | null>(null);

  useEffect(() => {
    if (!desktopRuntime || !window.cryptDesktop) return;
    let active = true;

    void window.cryptDesktop.updates.getState().then((nextState) => {
      if (active) setState(nextState);
    });
    const removeListener = window.cryptDesktop.updates.onStateChange(setState);

    return () => {
      active = false;
      removeListener();
    };
  }, [desktopRuntime]);

  const check = useCallback(async () => {
    if (!window.cryptDesktop) return;
    setState(await window.cryptDesktop.updates.check());
  }, []);

  const restartAndInstall = useCallback(async () => {
    await window.cryptDesktop?.updates.restartAndInstall();
  }, []);

  return {
    check,
    desktopRuntime,
    restartAndInstall,
    state,
  };
}
