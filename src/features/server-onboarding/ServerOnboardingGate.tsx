import { Navigate, useLocation, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { DoorOpen, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { useServerOnboardingStatus } from './serverOnboarding.queries';

export function ServerOnboardingGate({ children }: { children: ReactNode }) {
  const { serverId = '' } = useParams();
  const location = useLocation();
  const query = useServerOnboardingStatus(serverId, Boolean(serverId));

  if (!serverId) {
    return children;
  }

  if (query.isPending) {
    return (
      <main className="grid min-h-72 place-items-center p-6">
        <section className="grid justify-items-center gap-4 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-200">
            <DoorOpen size={21} />
          </span>
          <Spinner />
          <p className="text-sm text-crypt-muted">Verificando sua entrada…</p>
        </section>
      </main>
    );
  }

  if (query.error || !query.data) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <section className="panel p-7 text-center sm:p-9">
          <ShieldAlert className="mx-auto text-amber-300" />
          <h1 className="mt-4 text-xl font-semibold text-white">
            Não foi possível verificar a entrada
          </h1>
          <p className="mt-2 text-sm leading-6 text-crypt-muted">
            Confirme a conexão e tente novamente. As permissões do servidor continuam protegidas no
            banco.
          </p>
          <Button
            className="mt-5"
            leadingIcon={<RefreshCw size={15} />}
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </Button>
        </section>
      </main>
    );
  }

  if (query.data.onboarding_required) {
    return (
      <Navigate
        replace
        state={{
          from: location.pathname + location.search,
        }}
        to={`/app/servidores/${serverId}/entrada`}
      />
    );
  }

  return children;
}
