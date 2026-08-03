import { onlineManager } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isAndroidRuntime } from '../../lib/platform';

export function MobileNetworkStatus() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    const applyStatus = (isConnected: boolean) => {
      if (disposed) return;
      setConnected(isConnected);
      onlineManager.setOnline(isConnected);
    };
    const handleOnline = () => applyStatus(true);
    const handleOffline = () => applyStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    applyStatus(navigator.onLine);

    if (!isAndroidRuntime()) {
      return () => {
        disposed = true;
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    void import('@capacitor/network')
      .then(async ({ Network }) => {
        const initialStatus = await Network.getStatus();
        applyStatus(initialStatus.connected);

        const listener = await Network.addListener('networkStatusChange', (status) => {
          applyStatus(status.connected);
        });

        if (disposed) {
          await listener.remove();
        } else {
          removeListener = () => listener.remove();
        }
      })
      .catch(() => {
        if (!disposed) {
          const fallbackConnected = navigator.onLine;
          setConnected(fallbackConnected);
          onlineManager.setOnline(fallbackConnected);
        }
      });

    return () => {
      disposed = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      void removeListener?.();
    };
  }, []);

  if (connected !== false) return null;

  return (
    <aside
      aria-live="assertive"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[90] mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-950/95 px-4 py-3 text-center text-xs font-semibold text-amber-100 shadow-2xl backdrop-blur"
      role="status"
    >
      <WifiOff aria-hidden="true" size={16} />
      Sem conexão. Suas telas continuam abertas e o Crypt reconectará automaticamente.
    </aside>
  );
}
