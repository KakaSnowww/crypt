import { ArrowRight, CalendarClock, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { ServerIcon } from '../features/servers/components/ServerIcon';
import { toServerActionError } from '../features/servers/servers.errors';
import { useServerInvitePreview } from '../features/servers/servers.queries';
import { getServerMediaUrl } from '../features/servers/servers.service';
import { useServerActions } from '../features/servers/useServerActions';

export function ServerInviteRoute() {
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const previewQuery = useServerInvitePreview(code);
  const actions = useServerActions();

  if (previewQuery.isPending) {
    return (
      <div aria-label="Validando convite" className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  }

  const preview = previewQuery.data;

  if (previewQuery.error || !preview) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <section className="panel p-7 text-center sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-500/10 text-red-200">
            <LockKeyhole aria-hidden="true" size={24} />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-white">Convite indisponível</h1>
          <p className="mt-3 text-sm leading-6 text-crypt-muted">
            O código pode ter expirado, sido revogado ou atingido o limite de usos.
          </p>
          <Button className="mt-6" onClick={() => void navigate('/app/servidores')}>
            Voltar aos servidores
          </Button>
        </section>
      </main>
    );
  }

  const bannerUrl = getServerMediaUrl(preview.banner_path);

  async function handleJoin() {
    const serverId = await actions.join.mutateAsync(code).catch(() => null);

    if (serverId) {
      void navigate(`/app/servidores/${serverId}`, { replace: true });
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="panel overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-violet-600/35 via-blue-600/20 to-crypt-elevated sm:h-52">
          {bannerUrl ? <img alt="" className="size-full object-cover" src={bannerUrl} /> : null}
        </div>
        <div className="p-6 sm:p-9">
          <div className="-mt-16 flex flex-col items-start gap-5 sm:-mt-20 sm:flex-row sm:items-end">
            <span className="rounded-[2rem] border-4 border-crypt-panel bg-crypt-panel p-1">
              <ServerIcon iconPath={preview.icon_path} name={preview.server_name} size="lg" />
            </span>
            <div className="pb-1">
              <p className="eyebrow">Convite para servidor privado</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                {preview.server_name}
              </h1>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-6 text-crypt-muted">
            {preview.server_description ?? 'Uma comunidade privada no Crypt.'}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <span className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <Users className="text-violet-200" size={18} />
              <strong className="mt-2 block text-sm text-white">{preview.member_count}</strong>
              <span className="text-xs text-crypt-subtle">membros</span>
            </span>
            <span className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <ShieldCheck className="text-emerald-200" size={18} />
              <strong className="mt-2 block text-sm text-white">
                {preview.owner_display_name}
              </strong>
              <span className="text-xs text-crypt-subtle">proprietário</span>
            </span>
            <span className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <CalendarClock className="text-blue-200" size={18} />
              <strong className="mt-2 block text-sm text-white">
                {preview.remaining_uses ?? 'Sem limite'}
              </strong>
              <span className="text-xs text-crypt-subtle">usos restantes</span>
            </span>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            {preview.already_member ? (
              <Button
                leadingIcon={<ArrowRight aria-hidden="true" size={16} />}
                onClick={() => void navigate(`/app/servidores/${preview.server_id}`)}
              >
                Abrir servidor
              </Button>
            ) : (
              <Button
                leadingIcon={<ArrowRight aria-hidden="true" size={16} />}
                loading={actions.join.isPending}
                onClick={() => void handleJoin()}
              >
                Aceitar convite
              </Button>
            )}
            <Button onClick={() => void navigate('/app/servidores')} variant="ghost">
              Agora não
            </Button>
          </div>
          {actions.join.error ? (
            <p className="mt-4 text-xs text-red-300">
              {toServerActionError(actions.join.error).message}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
