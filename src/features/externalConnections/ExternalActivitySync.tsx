import { useEffect } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuth } from '../auth/useAuth';
import { refreshExternalConnection } from './externalConnections.service';

const spotifyRefreshIntervalMs = 60_000;

export function ExternalActivitySync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !isSupabaseConfigured() || import.meta.env.MODE === 'test') return;

    let active = true;
    let refreshing = false;

    async function refreshSpotify() {
      if (!active || refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        await refreshExternalConnection('spotify');
      } catch {
        // A sincronização é silenciosa. Erros aparecem quando a pessoa abre Contas conectadas.
      } finally {
        refreshing = false;
      }
    }

    const initialTimer = window.setTimeout(() => void refreshSpotify(), 4_000);
    const interval = window.setInterval(() => void refreshSpotify(), spotifyRefreshIntervalMs);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshSpotify();
    };
    const handleOnline = () => void refreshSpotify();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [user]);

  return null;
}
