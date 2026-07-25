import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from './useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <main
        aria-label="Carregando sessão"
        aria-live="polite"
        className="grid min-h-dvh place-items-center bg-crypt-background text-crypt-muted"
      >
        <div className="grid justify-items-center gap-3">
          <Spinner />
          <p className="text-sm">Verificando sua sessão…</p>
        </div>
      </main>
    );
  }

  if (status !== 'authenticated') {
    const next = `${location.pathname}${location.search}`;
    const reason = status === 'unconfigured' ? '&reason=configuration' : '';
    return <Navigate replace to={`/login?next=${encodeURIComponent(next)}${reason}`} />;
  }

  return children;
}
