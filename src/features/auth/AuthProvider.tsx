import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { unregisterCurrentPushDevice } from '../notifications/pushDevices';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<null | Session>(null);
  const [status, setStatus] = useState<AuthStatus>(configured ? 'loading' : 'unconfigured');

  useEffect(() => {
    if (!configured) {
      return;
    }

    const client = getSupabaseClient();
    let active = true;

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }

      const currentSession = error ? null : data.session;
      setSession(currentSession);
      setStatus(currentSession ? 'authenticated' : 'anonymous');
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'anonymous');

      if (!nextSession) {
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured, queryClient]);

  const signOut = useCallback(async () => {
    if (!configured) {
      setSession(null);
      setStatus('unconfigured');
      return;
    }

    const client = getSupabaseClient();
    await unregisterCurrentPushDevice();
    await client.auth.signOut({ scope: 'local' });
    queryClient.clear();
    setSession(null);
    setStatus('anonymous');
  }, [configured, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      signOut,
      status,
      user: session?.user ?? null,
    }),
    [session, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
