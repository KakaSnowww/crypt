import { DoorOpen, LockKeyhole } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { resolveServerEntryPath } from '../features/servers/serverNavigation';
import { useServerOverview } from '../features/servers/servers.queries';
import { useServerChannels } from '../features/workspace/workspace.queries';

export function ServerOpenRoute() {
  const navigate = useNavigate();
  const { serverId = '' } = useParams();
  const overviewQuery = useServerOverview(serverId);
  const channelsQuery = useServerChannels(serverId);

  const destination = useMemo(() => {
    const overview = overviewQuery.data;

    if (!overview || !channelsQuery.data) {
      return null;
    }

    return resolveServerEntryPath({
      channels: channelsQuery.data,
      defaultChannelId: overview.default_channel_id,
      serverId,
    });
  }, [channelsQuery.data, overviewQuery.data, serverId]);

  useEffect(() => {
    if (!destination) return;

    void navigate(destination, {
      replace: true,
    });
  }, [destination, navigate]);

  if (overviewQuery.isPending || channelsQuery.isPending || destination) {
    return (
      <main className="grid min-h-72 place-items-center p-6">
        <section
          aria-label="Abrindo servidor"
          className="grid justify-items-center gap-4 text-center"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-200">
            <DoorOpen aria-hidden="true" size={22} />
          </span>
          <Spinner />
          <p className="text-sm text-crypt-muted">Abrindo o canal mais recente…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <section className="panel p-7 text-center sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-500/10 text-red-200">
          <LockKeyhole aria-hidden="true" size={24} />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-white">Servidor indisponível</h1>
        <p className="mt-3 text-sm leading-6 text-crypt-muted">
          Você pode não fazer mais parte deste servidor ou não possuir canais visíveis.
        </p>
        <Button
          className="mt-6"
          onClick={() => void navigate('/app/servidores', { replace: true })}
        >
          Ver meus servidores
        </Button>
      </section>
    </main>
  );
}
