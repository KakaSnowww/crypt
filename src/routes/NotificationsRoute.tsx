import { useQueryClient } from '@tanstack/react-query';
import {
  AtSign,
  Bell,
  BellRing,
  CheckCheck,
  MessageCircle,
  Settings2,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { Toggle } from '../components/common/Toggle';
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar';
import {
  notificationKeys,
  useNotificationPreferences,
  useNotifications,
} from '../features/notifications/notifications.queries';
import {
  markAllNotificationsRead,
  markNotificationRead,
  saveNotificationPreferences,
} from '../features/notifications/notifications.service';
import {
  requestSystemNotificationPermission,
  systemNotificationPermission,
  systemNotificationSupport,
} from '../features/notifications/systemNotifications';
import type {
  CryptNotification,
  NotificationPreferences,
  NotificationType,
} from '../features/notifications/notifications.types';

const notificationIcons: Record<NotificationType, ComponentType<{ size?: number }>> = {
  channel_mention: AtSign,
  direct_message: MessageCircle,
  friend_accepted: UserPlus,
  friend_request: UserPlus,
  moderation_report: ShieldAlert,
};

export function NotificationsRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('aba') === 'preferencias' ? 'preferences' : 'activity';
  const unreadOnly = searchParams.get('filtro') === 'nao-lidas';
  const notificationsQuery = useNotifications(true, unreadOnly);
  const preferencesQuery = useNotificationPreferences();
  const unreadCount = (notificationsQuery.data ?? []).filter(
    (notification) => !notification.read_at,
  ).length;
  const [actionError, setActionError] = useState<string>();
  const [isMarkingAll, setMarkingAll] = useState(false);

  async function openNotification(notification: CryptNotification) {
    setActionError(undefined);
    try {
      if (!notification.read_at) {
        await markNotificationRead(notification.notification_id);
        await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }
      if (notification.target_path) {
        void navigate(notification.target_path);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível abrir.');
    }
  }

  async function markAllRead() {
    setActionError(undefined);
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível marcar.');
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-7 sm:py-8">
      <section className="panel overflow-hidden">
        <div className="border-b border-white/[0.07] p-5 sm:p-7">
          <div className="flex flex-wrap items-start gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-blue-500/20 text-violet-200">
              <BellRing aria-hidden="true" size={23} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Central pessoal</p>
              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Notificações</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-crypt-muted">
                Acompanhe mensagens, menções, amizades e atividades administrativas em um só lugar.
              </p>
            </div>
            {tab === 'activity' && unreadCount ? (
              <Button loading={isMarkingAll} onClick={() => void markAllRead()} variant="secondary">
                <CheckCheck aria-hidden="true" size={16} />
                Marcar todas como lidas
              </Button>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-2" role="tablist">
            <Button
              aria-selected={tab === 'activity'}
              onClick={() => setSearchParams({})}
              role="tab"
              variant={tab === 'activity' ? 'primary' : 'ghost'}
            >
              <Bell size={16} />
              Atividade
            </Button>
            <Button
              aria-selected={tab === 'preferences'}
              onClick={() => setSearchParams({ aba: 'preferencias' })}
              role="tab"
              variant={tab === 'preferences' ? 'primary' : 'ghost'}
            >
              <Settings2 size={16} />
              Preferências
            </Button>
          </div>
        </div>

        {actionError ? (
          <p className="mx-5 mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:mx-7">
            {actionError}
          </p>
        ) : null}

        {tab === 'activity' ? (
          <div className="p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-2">
              <Button
                onClick={() => setSearchParams({})}
                size="sm"
                variant={!unreadOnly ? 'secondary' : 'ghost'}
              >
                Todas
              </Button>
              <Button
                onClick={() => setSearchParams({ filtro: 'nao-lidas' })}
                size="sm"
                variant={unreadOnly ? 'secondary' : 'ghost'}
              >
                Não lidas
              </Button>
            </div>

            {notificationsQuery.isPending ? (
              <div className="grid min-h-52 place-items-center">
                <Spinner label="Carregando notificações" />
              </div>
            ) : notificationsQuery.error ? (
              <EmptyState
                description={notificationsQuery.error.message}
                title="Não foi possível carregar"
              />
            ) : notificationsQuery.data?.length ? (
              <div className="grid gap-2">
                {notificationsQuery.data.map((notification) => (
                  <NotificationCard
                    key={notification.notification_id}
                    notification={notification}
                    onOpen={() => void openNotification(notification)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                description={
                  unreadOnly
                    ? 'Você já conferiu todas as novidades.'
                    : 'Novas mensagens, menções e amizades aparecerão aqui.'
                }
                title={unreadOnly ? 'Tudo em dia' : 'Nenhuma notificação ainda'}
              />
            )}
          </div>
        ) : preferencesQuery.isPending ? (
          <div className="grid min-h-52 place-items-center">
            <Spinner label="Carregando preferências" />
          </div>
        ) : preferencesQuery.data ? (
          <NotificationPreferencesForm initialPreferences={preferencesQuery.data} />
        ) : (
          <EmptyState
            description={preferencesQuery.error?.message ?? 'Tente novamente em instantes.'}
            title="Preferências indisponíveis"
          />
        )}
      </section>
    </main>
  );
}

function NotificationCard({
  notification,
  onOpen,
}: {
  notification: CryptNotification;
  onOpen: () => void;
}) {
  const Icon = notificationIcons[notification.notification_type];

  return (
    <button
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-violet-400/30 hover:bg-white/[0.045] ${
        notification.read_at
          ? 'border-white/[0.06] bg-white/[0.018]'
          : 'border-violet-400/20 bg-violet-500/[0.07]'
      }`}
      onClick={onOpen}
      type="button"
    >
      {notification.actor_id ? (
        <ProfileAvatar
          avatarPath={notification.actor_avatar_path}
          displayName={notification.actor_display_name ?? notification.title}
          size="sm"
        />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-violet-200">
          <Icon size={16} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-3">
          <strong className="min-w-0 flex-1 text-sm text-white">{notification.title}</strong>
          <time className="shrink-0 text-[0.68rem] text-crypt-subtle">
            {formatNotificationDate(notification.created_at)}
          </time>
        </span>
        <span className="mt-1 block text-xs leading-5 text-crypt-muted">{notification.body}</span>
      </span>
      {!notification.read_at ? (
        <span aria-label="Não lida" className="mt-2 size-2 shrink-0 rounded-full bg-violet-400" />
      ) : null}
    </button>
  );
}

function NotificationPreferencesForm({
  initialPreferences,
}: {
  initialPreferences: NotificationPreferences;
}) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isSaving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const permission = systemNotificationPermission();
  const supported = systemNotificationSupport();

  const update = (key: keyof NotificationPreferences, checked: boolean) =>
    setPreferences((current) => ({ ...current, [key]: checked }));

  async function enableSystemNotifications() {
    const nextPermission = await requestSystemNotificationPermission();
    if (nextPermission === 'granted') {
      update('system_enabled', true);
      setFeedback('Permissão concedida. Salve as preferências para concluir.');
    } else if (nextPermission === 'denied') {
      update('system_enabled', false);
      setFeedback('A permissão foi bloqueada nas configurações do dispositivo.');
    } else {
      setFeedback('Este navegador não oferece notificações do sistema neste ambiente.');
    }
  }

  async function save() {
    setSaving(true);
    setFeedback(undefined);
    try {
      await saveNotificationPreferences(preferences);
      await queryClient.invalidateQueries({ queryKey: notificationKeys.preferences });
      setFeedback('Preferências salvas.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 p-5 sm:p-7">
      <div className="rounded-2xl border border-blue-400/15 bg-blue-500/[0.06] p-4">
        <p className="text-sm font-semibold text-blue-100">Alertas do sistema</p>
        <p className="mt-1 text-xs leading-5 text-crypt-muted">
          Exibidos pelo Windows, Android ou navegador enquanto o Crypt estiver aberto. Alertas com o
          aplicativo completamente fechado serão ativados nas fases de publicação.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            disabled={!supported || permission === 'granted'}
            onClick={() => void enableSystemNotifications()}
            size="sm"
            variant="secondary"
          >
            {permission === 'granted' ? 'Permissão concedida' : 'Permitir no dispositivo'}
          </Button>
          <span className="text-xs text-crypt-subtle">
            {!supported
              ? 'Indisponível neste ambiente'
              : permission === 'denied'
                ? 'Bloqueada no dispositivo'
                : permission === 'granted'
                  ? 'Pronta para uso'
                  : 'Aguardando sua autorização'}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Toggle
          checked={preferences.in_app_enabled}
          description="Mostra avisos dentro do Crypt quando uma novidade chega."
          label="Avisos dentro do Crypt"
          onChange={(checked) => update('in_app_enabled', checked)}
        />
        <Toggle
          checked={preferences.system_enabled}
          description="Usa a central de notificações do dispositivo quando houver permissão."
          disabled={permission !== 'granted'}
          label="Alertas do sistema"
          onChange={(checked) => update('system_enabled', checked)}
        />
        <Toggle
          checked={preferences.friend_activity_enabled}
          description="Pedidos de amizade e pedidos aceitos."
          label="Amizades"
          onChange={(checked) => update('friend_activity_enabled', checked)}
        />
        <Toggle
          checked={preferences.direct_messages_enabled}
          description="Novas mensagens nas suas conversas privadas."
          label="Mensagens privadas"
          onChange={(checked) => update('direct_messages_enabled', checked)}
        />
        <Toggle
          checked={preferences.mentions_enabled}
          description="Quando alguém mencionar você em um canal."
          label="Menções em canais"
          onChange={(checked) => update('mentions_enabled', checked)}
        />
        <Toggle
          checked={preferences.moderation_enabled}
          description="Novas denúncias nos servidores que você modera."
          label="Moderação"
          onChange={(checked) => update('moderation_enabled', checked)}
        />
        <Toggle
          checked={preferences.sound_enabled}
          description="Toca um aviso curto quando uma notificação chega."
          label="Som de notificação"
          onChange={(checked) => update('sound_enabled', checked)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={isSaving} onClick={() => void save()}>
          Salvar preferências
        </Button>
        {feedback ? <p className="text-xs text-crypt-muted">{feedback}</p> : null}
      </div>
    </div>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/10 p-7 text-center">
      <div>
        <Bell className="mx-auto text-crypt-subtle" size={25} />
        <h2 className="mt-3 text-base font-semibold text-white">{title}</h2>
        <p className="mt-1 max-w-md text-sm leading-6 text-crypt-muted">{description}</p>
      </div>
    </div>
  );
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  return new Intl.DateTimeFormat('pt-BR', {
    day: sameDay ? undefined : '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: sameDay ? undefined : 'short',
  }).format(date);
}
