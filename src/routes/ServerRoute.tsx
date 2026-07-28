import {
  CalendarClock,
  Copy,
  Crown,
  Flag,
  Hash,
  Gavel,
  Link2,
  LogOut,
  MessageCircle,
  LayoutList,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { Textarea } from '../components/common/Textarea';
import { useToast } from '../components/common/ToastContext';
import { useModerationActions } from '../features/moderation/useModerationActions';
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar';
import { ServerIcon } from '../features/servers/components/ServerIcon';
import { toServerActionError } from '../features/servers/servers.errors';
import {
  useServerInvites,
  useServerMembers,
  useServerOverview,
} from '../features/servers/servers.queries';
import { getServerMediaUrl } from '../features/servers/servers.service';
import { useServerActions } from '../features/servers/useServerActions';
import { hasPermission, serverPermission } from '../features/workspace/workspace.permissions';
import { useMyServerPermissions, useServerChannels } from '../features/workspace/workspace.queries';

const expirationOptions = [
  { label: '1 hora', value: '1' },
  { label: '24 horas', value: '24' },
  { label: '7 dias', value: '168' },
  { label: '30 dias', value: '720' },
  { label: 'Nunca', value: 'never' },
] as const;

const useOptions = [
  { label: 'Sem limite', value: 'unlimited' },
  { label: '1 uso', value: '1' },
  { label: '5 usos', value: '5' },
  { label: '10 usos', value: '10' },
  { label: '25 usos', value: '25' },
] as const;

export function ServerRoute() {
  const navigate = useNavigate();
  const { serverId = '' } = useParams();
  const { addToast } = useToast();
  const overviewQuery = useServerOverview(serverId);
  const membersQuery = useServerMembers(serverId);
  const invitesQuery = useServerInvites(serverId);
  const actions = useServerActions();
  const moderationActions = useModerationActions(serverId);
  const channelsQuery = useServerChannels(serverId);
  const permissionsQuery = useMyServerPermissions(serverId);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [expiration, setExpiration] = useState('168');
  const [maxUses, setMaxUses] = useState('unlimited');
  const [createdCode, setCreatedCode] = useState<string>();
  const [reportTarget, setReportTarget] = useState<null | { id: string; name: string }>(null);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');

  if (
    overviewQuery.isPending ||
    membersQuery.isPending ||
    invitesQuery.isPending ||
    channelsQuery.isPending ||
    permissionsQuery.isPending
  ) {
    return (
      <div aria-label="Carregando servidor" className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  }

  const overview = overviewQuery.data;
  const canModerate =
    Boolean(overview?.is_owner) ||
    hasPermission(permissionsQuery.data ?? 0, serverPermission.manageMembers);

  if (overviewQuery.error || !overview) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <section className="panel p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Servidor indisponível</h1>
          <p className="mt-2 text-sm text-crypt-muted">
            Você pode ter saído ou não possuir acesso a este espaço privado.
          </p>
          <Button className="mt-5" onClick={() => void navigate('/app/servidores')}>
            Ver meus servidores
          </Button>
        </section>
      </main>
    );
  }

  const bannerUrl = getServerMediaUrl(overview.banner_path);
  const members = membersQuery.data ?? [];
  const invites = invitesQuery.data ?? [];
  const channels = channelsQuery.data ?? [];
  const firstChannel =
    channels.find((channel) => channel.channel_id === overview.default_channel_id) ?? channels[0];

  async function copyInvite(code: string) {
    const url = `${window.location.origin}/app/convite/${code}`;

    try {
      await navigator.clipboard.writeText(url);
      addToast({
        message: 'O link completo está pronto para compartilhar.',
        title: 'Convite copiado',
        tone: 'success',
      });
    } catch {
      addToast({
        message: url,
        title: 'Copie este convite',
        tone: 'info',
      });
    }
  }

  async function handleCreateInvite() {
    actions.createInvite.reset();
    const code = await actions.createInvite
      .mutateAsync({
        expiresInHours: expiration === 'never' ? null : Number(expiration),
        maxUses: maxUses === 'unlimited' ? null : Number(maxUses),
        serverId,
      })
      .catch(() => null);

    if (code) {
      setCreatedCode(code);
      await copyInvite(code);
    }
  }

  async function handleLeave() {
    const succeeded = await actions.leave
      .mutateAsync(serverId)
      .then(() => true)
      .catch(() => false);

    if (succeeded) {
      setLeaveOpen(false);
      void navigate('/app/servidores', { replace: true });
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="panel overflow-hidden">
        <div className="h-36 bg-gradient-to-br from-violet-600/35 via-blue-600/20 to-crypt-elevated sm:h-48">
          {bannerUrl ? <img alt="" className="size-full object-cover" src={bannerUrl} /> : null}
        </div>
        <div className="p-5 sm:p-7">
          <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
            <span className="w-fit rounded-[1.75rem] border-4 border-crypt-panel bg-crypt-panel p-1">
              <ServerIcon iconPath={overview.icon_path} name={overview.server_name} size="lg" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-3xl font-bold tracking-tight text-white">
                  {overview.server_name}
                </h1>
                {overview.is_owner ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-[0.68rem] font-semibold text-violet-200">
                    <Crown aria-hidden="true" size={12} />
                    Seu servidor
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-crypt-muted">
                {overview.server_description ?? 'Servidor privado do Crypt.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {canModerate ? (
                <Button
                  leadingIcon={<Gavel aria-hidden="true" size={16} />}
                  onClick={() => void navigate(`/app/servidores/${serverId}/moderacao`)}
                  variant="secondary"
                >
                  Moderação
                </Button>
              ) : null}
              {overview.is_owner ? (
                <>
                  <Button
                    leadingIcon={<LayoutList aria-hidden="true" size={16} />}
                    onClick={() => void navigate(`/app/servidores/${serverId}/gerenciar`)}
                    variant="secondary"
                  >
                    Organizar
                  </Button>
                  <Button
                    leadingIcon={<Settings aria-hidden="true" size={16} />}
                    onClick={() => void navigate(`/app/servidores/${serverId}/configuracoes`)}
                    variant="secondary"
                  >
                    Configurações
                  </Button>
                </>
              ) : (
                <Button
                  leadingIcon={<LogOut aria-hidden="true" size={16} />}
                  onClick={() => setLeaveOpen(true)}
                  variant="ghost"
                >
                  Sair
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-crypt-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Users aria-hidden="true" size={14} />
              {overview.member_count} {overview.member_count === 1 ? 'membro' : 'membros'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden="true" size={14} />
              Proprietário: {overview.owner_display_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock aria-hidden="true" size={14} />
              Criado em {formatDate(overview.created_at)}
            </span>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid gap-6">
          <section className="panel p-5 sm:p-7" aria-labelledby="channel-title">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
                <Hash aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 className="font-semibold text-white" id="channel-title">
                  {firstChannel?.channel_name ?? overview.default_channel_name ?? 'Conversa Geral'}
                </h2>
                <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                  {firstChannel?.topic ?? 'Abra o canal e comece a conversa em tempo real.'}
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-7 text-center">
              <MessageCircle className="mx-auto text-crypt-subtle" size={25} />
              <p className="mt-3 text-sm font-semibold text-white">
                {channels.length}{' '}
                {channels.length === 1 ? 'canal disponível' : 'canais disponíveis'}
              </p>
              <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                Histórico paginado, respostas, reações, anexos e mensagens em tempo real.
              </p>
              {firstChannel ? (
                <Button
                  className="mt-4"
                  onClick={() =>
                    void navigate(
                      firstChannel.channel_type === 'voice' || firstChannel.channel_type === 'video'
                        ? `/app/servidores/${serverId}/chamadas/${firstChannel.channel_id}`
                        : `/app/servidores/${serverId}/canais/${firstChannel.channel_id}`,
                    )
                  }
                >
                  Abrir {firstChannel.channel_name}
                </Button>
              ) : null}
            </div>
          </section>

          <section className="panel p-5 sm:p-7" aria-labelledby="invites-title">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-200">
                <UserPlus aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 className="font-semibold text-white" id="invites-title">
                  Convites
                </h2>
                <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                  O backend valida validade, usos, revogação, banimento e duplicidade.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="grid gap-2 text-sm font-medium text-white">
                Validade
                <select
                  className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3 text-sm text-white outline-none focus:border-violet-400/70"
                  onChange={(event) => setExpiration(event.target.value)}
                  value={expiration}
                >
                  {expirationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-white">
                Limite
                <select
                  className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3 text-sm text-white outline-none focus:border-violet-400/70"
                  onChange={(event) => setMaxUses(event.target.value)}
                  value={maxUses}
                >
                  {useOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                leadingIcon={<Link2 aria-hidden="true" size={16} />}
                loading={actions.createInvite.isPending}
                onClick={() => void handleCreateInvite()}
              >
                Criar e copiar
              </Button>
            </div>
            {actions.createInvite.error ? (
              <p className="mt-3 text-xs text-red-300">
                {toServerActionError(actions.createInvite.error).message}
              </p>
            ) : null}
            {createdCode ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-violet-400/15 bg-violet-500/[0.07] p-3">
                <code className="min-w-0 flex-1 truncate text-xs text-violet-100">
                  {window.location.origin}/app/convite/{createdCode}
                </code>
                <Button
                  leadingIcon={<Copy aria-hidden="true" size={14} />}
                  onClick={() => void copyInvite(createdCode)}
                  size="sm"
                  variant="secondary"
                >
                  Copiar
                </Button>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3">
              {invites.length ? (
                invites.map((invite) => (
                  <article
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center"
                    key={invite.invite_id}
                  >
                    <div className="min-w-0 flex-1">
                      <code className="block truncate text-xs font-semibold text-violet-200">
                        {invite.invite_code}
                      </code>
                      <p className="mt-1 text-xs text-crypt-subtle">
                        {invite.uses_count}
                        {invite.max_uses === null ? ' usos' : ` de ${invite.max_uses} usos`} ·{' '}
                        {invite.expires_at
                          ? `expira em ${formatDateTime(invite.expires_at)}`
                          : 'sem expiração'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        leadingIcon={<Copy aria-hidden="true" size={14} />}
                        onClick={() => void copyInvite(invite.invite_code)}
                        size="sm"
                        variant="secondary"
                      >
                        Copiar
                      </Button>
                      <Button
                        leadingIcon={<X aria-hidden="true" size={14} />}
                        loading={
                          actions.revokeInvite.isPending &&
                          actions.revokeInvite.variables === invite.invite_id
                        }
                        onClick={() =>
                          void actions.revokeInvite
                            .mutateAsync(invite.invite_id)
                            .catch(() => undefined)
                        }
                        size="sm"
                        variant="ghost"
                      >
                        Revogar
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-crypt-subtle">
                  Nenhum convite ativo criado por você.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="panel h-fit p-5" aria-labelledby="members-title">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white" id="members-title">
              Membros
            </h2>
            <span className="text-xs text-crypt-subtle">{members.length}</span>
          </div>
          <div className="mt-4 grid gap-2">
            {members.map((member) => (
              <div className="flex items-center gap-1 rounded-xl" key={member.profile_id}>
                <Link
                  className="flex min-w-0 flex-1 items-center gap-3 p-2 transition hover:bg-white/[0.05]"
                  to={`/app/pessoas/${member.handle}`}
                >
                  <span className="relative">
                    <ProfileAvatar
                      avatarPath={member.avatar_path}
                      displayName={member.display_name}
                      size="sm"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-crypt-panel ${
                        member.is_online ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 truncate text-sm font-medium text-white">
                      {member.display_name}
                      {member.is_owner ? (
                        <Crown aria-label="Proprietário" className="text-amber-300" size={13} />
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-crypt-subtle">
                      @{member.handle}
                    </span>
                  </span>
                </Link>
                {!member.is_owner ? (
                  <button
                    aria-label={`Denunciar ${member.display_name}`}
                    className="rounded-lg p-2 text-crypt-subtle hover:bg-red-500/10 hover:text-red-300"
                    onClick={() =>
                      setReportTarget({ id: member.profile_id, name: member.display_name })
                    }
                    type="button"
                  >
                    <Flag aria-hidden="true" size={15} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </div>

      <Modal
        description="A denúncia ficará visível apenas para a equipe de moderação deste servidor."
        footer={
          <>
            <Button onClick={() => setReportTarget(null)} variant="ghost">
              Cancelar
            </Button>
            <Button
              loading={moderationActions.report.isPending}
              onClick={() => {
                if (!reportTarget) return;
                void moderationActions.report
                  .mutateAsync({
                    details: reportDetails,
                    profileId: reportTarget.id,
                    reason: reportReason,
                  })
                  .then(() => {
                    setReportTarget(null);
                    setReportDetails('');
                    addToast({ message: 'Denúncia enviada à moderação.', tone: 'success' });
                  });
              }}
            >
              Enviar denúncia
            </Button>
          </>
        }
        onOpenChange={(open) => !open && setReportTarget(null)}
        open={Boolean(reportTarget)}
        title={`Denunciar ${reportTarget?.name ?? 'membro'}`}
      >
        <label className="grid gap-2 text-sm font-medium text-white">
          Motivo
          <select
            className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3"
            onChange={(event) => setReportReason(event.target.value)}
            value={reportReason}
          >
            <option value="harassment">Assédio</option>
            <option value="spam">Spam</option>
            <option value="inappropriate_content">Conteúdo impróprio</option>
            <option value="impersonation">Falsidade ideológica</option>
            <option value="other">Outro</option>
          </select>
        </label>
        <div className="mt-4">
          <Textarea
            label="Detalhes"
            maxLength={1000}
            onChange={(event) => setReportDetails(event.target.value)}
            value={reportDetails}
          />
        </div>
        {moderationActions.report.error ? (
          <p className="mt-3 text-xs text-red-300">{moderationActions.report.error.message}</p>
        ) : null}
      </Modal>

      <Modal
        description="Você perderá acesso ao conteúdo privado. Para retornar, precisará de outro convite."
        footer={
          <>
            <Button onClick={() => setLeaveOpen(false)} variant="ghost">
              Permanecer
            </Button>
            <Button
              leadingIcon={<LogOut aria-hidden="true" size={16} />}
              loading={actions.leave.isPending}
              onClick={() => void handleLeave()}
              variant="danger"
            >
              Sair do servidor
            </Button>
          </>
        }
        onOpenChange={setLeaveOpen}
        open={leaveOpen}
        title={`Sair de ${overview.server_name}?`}
      >
        {actions.leave.error ? (
          <p className="text-sm text-red-300">{toServerActionError(actions.leave.error).message}</p>
        ) : (
          <p className="text-sm leading-6 text-crypt-muted">
            Sua conta e suas amizades não serão afetadas.
          </p>
        )}
      </Modal>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
