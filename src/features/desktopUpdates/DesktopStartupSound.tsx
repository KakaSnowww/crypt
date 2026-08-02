import { useEffect } from 'react';
import { isElectronRuntime } from '../../lib/platform';
import { playCryptSound } from '../../lib/sounds';

const startupDelayMs = 350;

export function DesktopStartupSound() {
  useEffect(() => {
    if (!isElectronRuntime()) return;

    const timeout = window.setTimeout(() => void playCryptSound('update'), startupDelayMs);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
