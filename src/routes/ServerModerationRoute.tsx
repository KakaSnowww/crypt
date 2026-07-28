import {
  Ban,
  ClipboardList,
  Flag,
  Gavel,
  Save,
  Settings,
  ShieldAlert,
  UserMinus,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Textarea } from '../components/common/Textarea';
import { Toggle } from '../components/common/Toggle';
import {
  useServerAuditLogs,
  useServerBans,
  useServerModerationSettings,
  useServerReports,
} from '../features/moderation/moderation.queries';
import { useModerationActions } from '../features/moderation/useModerationActions';
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar';
import { useServerMembers, useServerOverview } from '../features/servers/servers.queries';
import { hasPermission, serverPermission } from '../features/workspace/workspace.permissions';
import { useMyServerPermissions } from '../features/workspace/workspace.queries';

type Tab = 'audit' | 'bans' | 'members' | 'reports' | 'settings';

const actionLabels: Record<string, string> = {
  member_banned: 'baniu',
  member_kicked: 'expulsou',
  member_unbanned: 'removeu o banimento de',
  moderation_settings_updated: 'atualizou as preferências de moderação',
  report_resolved: 'analisou uma denúncia sobre',
};

export function ServerModerationRoute() {
  const { serverId = '' } = useParams();
  const [tab, setTab] = useState<Tab>('members');
  const overviewQuery = useServerOverview(serverId);
  const permissionsQuery = useMyServerPermissions(serverId);
  const allowed =
    Boolean(overviewQuery.data?.is_owner) ||
    hasPermission(permissionsQuery.data ?? 0, serverPermission.manageMembers);

  if (overviewQuery.isPending || permissionsQuery.isPending) {
    return <p className="p-8 text-center text-sm text-crypt-muted">Carregando moderação…</p>;
  }

  if (!overviewQuery.data || !allowed) {
    return (
      <main className="mx-auto w-full max-w-3xl p-6">
        <section className="panel p-8 text-center">
          <ShieldAlert className="mx-auto text-amber-300" />
          <h1 className="mt-3 text-xl font-semibold text-white">Moderação indisponível</h1>
          <p className="mt-2 text-sm text-crypt-muted">
            Seu cargo não possui a permissão Gerenciar membros.
          </p>
          <Link className="mt-5 inline-block text-violet-300" to={`/app/servidores/${serverId}`}>
            Voltar ao servidor
          </Link>
        </section>
      </main>
    );
  }

  const tabs: Array<{ icon: typeof Gavel; id: Tab; label: string }> = [
    { icon: Gavel, id: 'members', label: 'Membros' },
    { icon: Ban, id: 'bans', label: 'Banimentos' },
    { icon: Flag, id: 'reports', label: 'Denúncias' },
    { icon: ClipboardList, id: 'audit', label: 'Auditoria' },
    { icon: Settings, id: 'settings', label: 'Preferências' },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <p className="eyebrow">Fase 10</p>
      <h1 className="mt-2 text-3xl font-bold text-white">
        Moderação de {overviewQuery.data.server_name}
      </h1>
      <p className="mt-2 text-sm text-crypt-muted">
        Ações protegidas pela permissão e pela hierarquia de cargos, registradas na auditoria.
      </p>

      <div className="my-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ icon: Icon, id, label }) => (
          <Button
            key={id}
            leadingIcon={<Icon aria-hidden="true" size={16} />}
            onClick={() => setTab(id)}
            variant={tab === id ? 'primary' : 'secondary'}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'members' ? <MembersPanel serverId={serverId} /> : null}
      {tab === 'bans' ? <BansPanel serverId={serverId} /> : null}
      {tab === 'reports' ? <ReportsPanel serverId={serverId} /> : null}
      {tab === 'audit' ? <AuditPanel serverId={serverId} /> : null}
      {tab === 'settings' ? (
        <SettingsPanel isOwner={overviewQuery.data.is_owner} serverId={serverId} />
      ) : null}
    </main>
  );
}

function MembersPanel({ serverId }: { serverId: string }) {
  const membersQuery = useServerMembers(serverId);
  const actions = useModerationActions(serverId);
  const [selectedId, setSelectedId] = useState('');
  const [reason, setReason] = useState('');
  const members = (membersQuery.data ?? []).filter((member) => !member.is_owner);
  const error = actions.kick.error ?? actions.ban.error;

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Expulsar ou banir membro</h2>
      <p className="mt-1 text-xs text-crypt-subtle">
        Expulsar permite que a pessoa retorne por convite. Banir impede uma nova entrada.
      </p>
      <label className="mt-5 grid gap-2 text-sm font-medium text-white">
        Membro
        <select
          className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
        >
          <option value="">Selecione uma pessoa</option>
          {members.map((member) => (
            <option key={member.profile_id} value={member.profile_id}>
              {member.display_name} (@{member.handle})
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4">
        <Textarea
          helperText="Até 300 caracteres. O motivo aparece somente para moderadores."
          label="Motivo"
          maxLength={300}
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </div>
      {error ? <p className="mt-3 text-xs text-red-300">{error.message}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          disabled={!selectedId}
          leadingIcon={<UserMinus size={16} />}
          loading={actions.kick.isPending}
          onClick={() => void actions.kick.mutateAsync({ profileId: selectedId, reason })}
          variant="secondary"
        >
          Expulsar
        </Button>
        <Button
          disabled={!selectedId || !reason.trim()}
          leadingIcon={<Ban size={16} />}
          loading={actions.ban.isPending}
          onClick={() => void actions.ban.mutateAsync({ profileId: selectedId, reason })}
          variant="danger"
        >
          Banir
        </Button>
      </div>
    </section>
  );
}

function BansPanel({ serverId }: { serverId: string }) {
  const query = useServerBans(serverId);
  const actions = useModerationActions(serverId);
  return (
    <section className="grid gap-3">
      {(query.data ?? []).map((ban) => (
        <article className="panel flex items-center gap-4 p-4" key={ban.profile_id}>
          <ProfileAvatar avatarPath={ban.avatar_path} displayName={ban.display_name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{ban.display_name}</p>
            <p className="text-xs text-crypt-subtle">
              @{ban.handle} · {ban.reason ?? 'Sem motivo informado'}
            </p>
          </div>
          <Button
            loading={actions.unban.isPending && actions.unban.variables === ban.profile_id}
            onClick={() => void actions.unban.mutateAsync(ban.profile_id)}
            variant="secondary"
          >
            Remover ban
          </Button>
        </article>
      ))}
      {!query.isPending && !query.data?.length ? (
        <p className="panel p-8 text-center text-sm text-crypt-muted">Nenhum membro banido.</p>
      ) : null}
    </section>
  );
}

function ReportsPanel({ serverId }: { serverId: string }) {
  const query = useServerReports(serverId);
  const actions = useModerationActions(serverId);
  return (
    <section className="grid gap-3">
      {(query.data ?? []).map((report) => (
        <article className="panel p-5" key={report.report_id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-white">
              {report.reported_display_name} (@{report.reported_handle})
            </h2>
            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-crypt-muted">
              {report.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-crypt-muted">
            Motivo: {report.reason} · enviado por @{report.reporter_handle}
          </p>
          {report.details ? <p className="mt-2 text-sm text-crypt-text">{report.details}</p> : null}
          {report.status === 'open' ? (
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() =>
                  void actions.resolve.mutateAsync({
                    reportId: report.report_id,
                    status: 'resolved',
                  })
                }
              >
                Resolver
              </Button>
              <Button
                onClick={() =>
                  void actions.resolve.mutateAsync({
                    reportId: report.report_id,
                    status: 'dismissed',
                  })
                }
                variant="secondary"
              >
                Arquivar
              </Button>
            </div>
          ) : null}
        </article>
      ))}
      {!query.isPending && !query.data?.length ? (
        <p className="panel p-8 text-center text-sm text-crypt-muted">Nenhuma denúncia.</p>
      ) : null}
    </section>
  );
}

function AuditPanel({ serverId }: { serverId: string }) {
  const query = useServerAuditLogs(serverId);
  return (
    <section className="panel divide-y divide-white/[0.07]">
      {(query.data ?? []).map((entry) => (
        <article className="p-4" key={entry.audit_id}>
          <p className="text-sm text-white">
            <strong>{entry.actor_display_name ?? 'Conta removida'}</strong>{' '}
            {actionLabels[entry.action] ?? entry.action}{' '}
            {entry.target_display_name ? <strong>{entry.target_display_name}</strong> : null}
          </p>
          <p className="mt-1 text-xs text-crypt-subtle">
            {new Date(entry.created_at).toLocaleString('pt-BR')}
            {entry.reason ? ` · ${entry.reason}` : ''}
          </p>
        </article>
      ))}
      {!query.isPending && !query.data?.length ? (
        <p className="p-8 text-center text-sm text-crypt-muted">Nenhuma ação registrada.</p>
      ) : null}
    </section>
  );
}

function SettingsPanel({ isOwner, serverId }: { isOwner: boolean; serverId: string }) {
  const query = useServerModerationSettings(serverId);

  if (!query.data) {
    return (
      <p className="panel p-8 text-center text-sm text-crypt-muted">Carregando preferências…</p>
    );
  }

  return (
    <SettingsForm
      isOwner={isOwner}
      key={query.data.updated_at}
      serverId={serverId}
      settings={query.data}
    />
  );
}

function SettingsForm({
  isOwner,
  serverId,
  settings,
}: {
  isOwner: boolean;
  serverId: string;
  settings: NonNullable<ReturnType<typeof useServerModerationSettings>['data']>;
}) {
  const actions = useModerationActions(serverId);
  const [reports, setReports] = useState(settings.allow_member_reports);
  const [reason, setReason] = useState(settings.require_ban_reason);
  const [notifications, setNotifications] = useState(settings.notify_moderators_on_report);

  return (
    <section className="panel grid gap-3 p-5 sm:p-6">
      <Toggle
        checked={reports}
        description="Permite que membros enviem denúncias internas aos moderadores."
        disabled={!isOwner}
        label="Denúncias de membros"
        onChange={setReports}
      />
      <Toggle
        checked={reason}
        description="Impede banimentos sem uma justificativa registrada."
        disabled={!isOwner}
        label="Exigir motivo para banir"
        onChange={setReason}
      />
      <Toggle
        checked={notifications}
        description="Envia novas denúncias à central dos moderadores autorizados."
        disabled={!isOwner}
        label="Notificar moderadores"
        onChange={setNotifications}
      />
      {isOwner ? (
        <Button
          className="mt-2 justify-self-start"
          leadingIcon={<Save size={16} />}
          loading={actions.saveSettings.isPending}
          onClick={() =>
            void actions.saveSettings.mutateAsync({
              allow_member_reports: reports,
              notify_moderators_on_report: notifications,
              require_ban_reason: reason,
            })
          }
        >
          Salvar preferências
        </Button>
      ) : null}
    </section>
  );
}
