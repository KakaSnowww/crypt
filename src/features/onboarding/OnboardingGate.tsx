import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuth } from '../auth/useAuth';
import { toProfileActionError } from '../profile/profile.errors';
import { useProfileSettings } from '../profile/profile.queries';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const enabled = isSupabaseConfigured() && import.meta.env.MODE !== 'test';
  const settingsQuery = useProfileSettings(user?.id ?? null, enabled);

  if (!enabled) {
    return children;
  }

  if (settingsQuery.isPending) {
    return (
      <div
        aria-label="Carregando seu perfil"
        aria-live="polite"
        className="grid min-h-dvh place-items-center bg-crypt-background"
      >
        <Spinner />
      </div>
    );
  }

  if (settingsQuery.error) {
    return (
      <main className="grid min-h-dvh place-items-center bg-crypt-background px-4">
        <section className="panel max-w-lg p-7 text-center">
          <h1 className="text-xl font-semibold text-white">Não foi possível preparar seu perfil</h1>
          <p className="mt-3 text-sm leading-6 text-crypt-muted">
            {toProfileActionError(settingsQuery.error).message}
          </p>
          <Button className="mt-5" onClick={() => void settingsQuery.refetch()}>
            Tentar novamente
          </Button>
        </section>
      </main>
    );
  }

  if (!settingsQuery.data?.onboarding_completed_at) {
    return <Navigate replace to="/onboarding" />;
  }

  return children;
}
