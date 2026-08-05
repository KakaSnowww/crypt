import {
  ArrowRight,
  CalendarClock,
  Crown,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
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
      <main className="relative mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center overflow-hidden px-4 py-12 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_48%)]" />
        <section className="panel relative w-full overflow-hidden p-7 text-center sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-red-500/10 blur-3xl" />
          <span className="relative mx-auto grid size-16 place-items-center rounded-[1.4rem] border border-red-300/15 bg-red-500/10 text-red-200 shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
            <LockKeyhole aria-hidden="true" size={27} />
          </span>
          <h1 className="relative mt-5 text-2xl font-bold text-white">Convite indisponível</h1>
          <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-crypt-muted">
            O código pode ter expirado, sido revogado ou atingido o limite de usos.
          </p>
          <Button className="relative mt-6" onClick={() => void navigate('/app/servidores')}>
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
      void navigate(`/app/servidores/${serverId}/entrada`, { replace: true });
    }
  }

  return (
    <main className="relative mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-5xl place-items-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(91,33,182,0.20),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(8,145,178,0.12),transparent_38%)]" />
      <section className="relative grid w-full overflow-hidden rounded-[2rem] border border-violet-300/15 bg-[#0d1222]/95 shadow-[0_36px_110px_rgba(0,0,0,0.48)] lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="relative min-h-72 overflow-hidden lg:min-h-[34rem]">
          {bannerUrl ? (
            <img alt="" className="absolute inset-0 size-full object-cover" src={bannerUrl} />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(145deg,#241443,#111b36_55%,#081521)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,11,22,0.18),rgba(7,11,22,0.72)),linear-gradient(0deg,rgba(7,11,22,0.90),transparent_68%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(167,139,250,0.28),transparent_35%)]" />

          <div className="relative flex h-full min-h-72 flex-col justify-end p-6 sm:p-9 lg:min-h-[34rem] lg:p-11">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-violet-100 backdrop-blur-md">
              <Sparkles aria-hidden="true" size={13} />
              Convite do Crypt
            </p>
            <h1 className="mt-5 max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Você foi convidado para entrar em {preview.server_name}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200/85">
              {preview.server_description ??
                'Uma comunidade privada para conversar, compartilhar e criar momentos no Crypt.'}
            </p>
          </div>
        </div>

        <div className="relative flex flex-col justify-center border-t border-white/[0.06] bg-[linear-gradient(165deg,rgba(20,24,42,0.98),rgba(10,15,29,0.98))] p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 size-48 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <span className="rounded-[1.6rem] border border-violet-200/15 bg-white/[0.05] p-1.5 shadow-xl">
              <ServerIcon iconPath={preview.icon_path} name={preview.server_name} size="lg" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-crypt-subtle">
                Comunidade privada
              </p>
              <h2 className="mt-1 truncate text-xl font-bold text-white">{preview.server_name}</h2>
            </div>
          </div>

          <div className="relative mt-7 grid gap-3">
            <InviteDetail
              icon={<Users aria-hidden="true" size={17} />}
              label={preview.member_count === 1 ? 'membro' : 'membros'}
              value={String(preview.member_count)}
            />
            <InviteDetail
              icon={<Crown aria-hidden="true" size={17} />}
              label="proprietário"
              value={preview.owner_display_name}
            />
            <InviteDetail
              icon={<CalendarClock aria-hidden="true" size={17} />}
              label={`${
                preview.remaining_uses === null
                  ? 'usos ilimitados'
                  : preview.remaining_uses === 1
                    ? 'uso restante'
                    : 'usos restantes'
              } · ${preview.expires_at ? formatExpiry(preview.expires_at) : 'sem expiração'}`}
              value={
                preview.remaining_uses === null ? 'Sem limite' : String(preview.remaining_uses)
              }
            />
          </div>

          <div className="relative mt-7 rounded-2xl border border-emerald-300/10 bg-emerald-500/[0.05] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-emerald-200" size={18} />
              <p className="text-xs leading-5 text-emerald-50/75">
                O Crypt valida este convite antes de adicionar sua conta e não expõe o conteúdo do
                servidor antes da entrada.
              </p>
            </div>
          </div>

          <div className="relative mt-7 grid gap-3">
            {preview.already_member ? (
              <Button
                leadingIcon={<ArrowRight aria-hidden="true" size={16} />}
                onClick={() => void navigate(`/app/servidores/${preview.server_id}/abrir`)}
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
            <p className="relative mt-4 text-xs text-red-300">
              {toServerActionError(actions.join.error).message}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function InviteDetail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
        {icon}
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-sm text-white">{value}</strong>
        <span className="block truncate text-[0.7rem] text-crypt-subtle">{label}</span>
      </span>
    </div>
  );
}

function formatExpiry(value: string) {
  return `expira em ${new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))}`;
}
