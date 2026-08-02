import {
  Bell,
  Compass,
  Hash,
  Headphones,
  Home,
  LogOut,
  Monitor,
  Menu,
  MessageCircle,
  Palette,
  Plus,
  Search,
  Server as ServerGlyph,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../common/ToastContext';
import { useAuth } from '../../features/auth/useAuth';
import {
  useConnectionsRealtime,
  usePresenceHeartbeat,
} from '../../features/connections/useConnectionsRealtime';
import { useDirectConversations } from '../../features/directMessages/directMessages.queries';
import { useDirectListRealtime } from '../../features/directMessages/useDirectMessagesRealtime';
import { DesktopUpdateHeaderButton } from '../../features/desktopUpdates/DesktopUpdateHeaderButton';
import { AndroidUpdateHeaderButton } from '../../features/androidUpdates/AndroidUpdateHeaderButton';
import {
  useNotificationPreferences,
  useNotifications,
} from '../../features/notifications/notifications.queries';
import { useNotificationsRealtime } from '../../features/notifications/useNotificationsRealtime';
import { ProfileAvatar } from '../../features/profile/components/ProfileAvatar';
import { useCurrentProfile } from '../../features/profile/profile.queries';
import { ServerIcon } from '../../features/servers/components/ServerIcon';
import {
  useMyServers,
  useServerMembers,
  useServerOverview,
} from '../../features/servers/servers.queries';
import { useServersRealtime } from '../../features/servers/useServersRealtime';
import { VoiceCallPanel, VoiceChannelPresence } from '../../features/voice/VoiceCallPanel';
import { useServerVoicePresence } from '../../features/voice/voice.queries';
import type { VoiceChannelPresence as VoicePresenceEntry } from '../../features/voice/voice.types';
import { hasPermission, serverPermission } from '../../features/workspace/workspace.permissions';
import { ServerMemberGroups } from '../../features/workspace/components/ServerMemberGroups';
import {
  useMyServerPermissions,
  useServerCategories,
  useServerChannels,
  useServerMemberRoles,
  useServerRoles,
  useServerUnreadCounts,
} from '../../features/workspace/workspace.queries';
import type {
  ChannelUnread,
  ServerCategory,
  ServerChannel,
} from '../../features/workspace/workspace.types';
import { classNames } from '../../lib/classNames';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { isElectronRuntime } from '../../lib/platform';
import { IconButton } from '../common/IconButton';

const channelLinks = [
  {
    end: true,
    icon: Hash,
    label: 'Conversa Geral',
    to: '/app',
  },
  {
    end: false,
    icon: ServerGlyph,
    label: 'Servidores',
    to: '/app/servidores',
  },
  {
    end: false,
    icon: Palette,
    label: 'Base visual',
    to: '/app/componentes',
  },
  {
    end: false,
    icon: MessageCircle,
    label: 'Mensagens',
    to: '/app/mensagens',
  },
  {
    end: false,
    icon: Bell,
    label: 'Notificações',
    to: '/app/notificacoes',
  },
  {
    end: false,
    icon: Users,
    label: 'Conexões',
    to: '/app/conexoes',
  },
  {
    end: false,
    icon: UserRound,
    label: 'Meu perfil',
    to: '/app/perfil',
  },
  {
    end: true,
    icon: ShieldCheck,
    label: 'Conta e segurança',
    to: '/app/conta',
  },
] as const;

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [globalMenuOpen, setGlobalMenuOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const voicePresenceErrorRef = useRef<null | string>(null);
  const { addToast } = useToast();
  const { signOut, user } = useAuth();
  const selectedServerId = getServerIdFromPath(location.pathname);
  const isVoiceRoute = location.pathname.includes('/chamadas/');
  const isConversationRoute =
    location.pathname.includes('/canais/') ||
    /^\/app\/mensagens\/[0-9a-f-]{36}(?:\/|$)/i.test(location.pathname);
  const appDataEnabled = isSupabaseConfigured() && import.meta.env.MODE !== 'test';
  const desktopRuntime = isElectronRuntime();
  const profileQuery = useCurrentProfile(user?.id ?? null, appDataEnabled);
  const serversQuery = useMyServers(appDataEnabled);
  const serverOverviewQuery = useServerOverview(selectedServerId, appDataEnabled);
  const serverMembersQuery = useServerMembers(selectedServerId, appDataEnabled);
  const serverCategoriesQuery = useServerCategories(selectedServerId, appDataEnabled);
  const serverChannelsQuery = useServerChannels(selectedServerId, appDataEnabled);
  const serverRolesQuery = useServerRoles(selectedServerId, appDataEnabled);
  const serverMemberRolesQuery = useServerMemberRoles(selectedServerId, appDataEnabled);
  const serverPermissionsQuery = useMyServerPermissions(selectedServerId, appDataEnabled);
  const serverUnreadQuery = useServerUnreadCounts(selectedServerId, appDataEnabled);
  const voiceChannelIds = (serverChannelsQuery.data ?? [])
    .filter((channel) => channel.channel_type === 'voice' || channel.channel_type === 'video')
    .map((channel) => channel.channel_id);
  const voicePresenceQuery = useServerVoicePresence(
    selectedServerId,
    voiceChannelIds,
    appDataEnabled,
  );
  const notificationsQuery = useNotifications(appDataEnabled);
  const notificationPreferencesQuery = useNotificationPreferences(appDataEnabled);
  const directConversationsQuery = useDirectConversations(appDataEnabled);
  useConnectionsRealtime(user?.id ?? null);
  useNotificationsRealtime(user?.id ?? null, notificationPreferencesQuery.data);
  useDirectListRealtime(user?.id ?? null);
  usePresenceHeartbeat(user?.id ?? null);
  useServersRealtime(user?.id ?? null, selectedServerId);

  useEffect(() => {
    document.body.classList.add('app-shell-active');

    return () => {
      document.body.classList.remove('app-shell-active');
    };
  }, []);

  useEffect(() => {
    if (!voicePresenceQuery.error) {
      voicePresenceErrorRef.current = null;
      return;
    }

    if (voicePresenceErrorRef.current === voicePresenceQuery.error.message) return;
    voicePresenceErrorRef.current = voicePresenceQuery.error.message;

    addToast({
      message: voicePresenceQuery.error.message,
      title: 'Não foi possível ler a presença das chamadas',
      tone: 'error',
    });
  }, [addToast, voicePresenceQuery.error]);
  const currentServer =
    serverOverviewQuery.data ??
    serversQuery.data?.find((server) => server.server_id === selectedServerId);
  const serverMembers = serverMembersQuery.data ?? [];
  const serverCategories = serverCategoriesQuery.data ?? [];
  const serverChannels = serverChannelsQuery.data ?? [];
  const serverRoles = serverRolesQuery.data ?? [];
  const serverMemberRoles = serverMemberRolesQuery.data ?? [];
  const serverUnread = serverUnreadQuery.data ?? [];
  const canManageWorkspace =
    Boolean(currentServer?.is_owner) ||
    hasPermission(serverPermissionsQuery.data ?? 0, serverPermission.manageChannels) ||
    hasPermission(serverPermissionsQuery.data ?? 0, serverPermission.manageCategories) ||
    hasPermission(serverPermissionsQuery.data ?? 0, serverPermission.manageRoles);
  const unreadNotifications =
    notificationsQuery.data?.filter((notification) => !notification.read_at).length ?? 0;
  const unreadDirectMessages = (directConversationsQuery.data ?? []).reduce(
    (total, conversation) => total + conversation.unread_count,
    0,
  );
  const displayName =
    profileQuery.data?.display_name ??
    (typeof user?.user_metadata.display_name === 'string'
      ? user.user_metadata.display_name
      : 'Pessoa do Crypt');
  const handle =
    profileQuery.data?.handle ??
    (typeof user?.user_metadata.handle === 'string' ? user.user_metadata.handle : undefined);
  const identityLabel = handle ? `@${handle}` : user?.email;
  const pageHeader = location.pathname.startsWith('/app/servidores/')
    ? location.pathname.includes('/chamadas/')
      ? {
          description: 'Áudio, vídeo e compartilhamento em tempo real',
          icon: Headphones,
          title:
            serverChannels.find(
              (channel) => channel.channel_id === getChannelIdFromPath(location.pathname),
            )?.channel_name ?? 'Chamada',
        }
      : location.pathname.includes('/canais/')
        ? {
            description:
              serverChannels.find(
                (channel) => channel.channel_id === getChannelIdFromPath(location.pathname),
              )?.topic ?? 'Conversa em tempo real',
            icon: Hash,
            title:
              serverChannels.find(
                (channel) => channel.channel_id === getChannelIdFromPath(location.pathname),
              )?.channel_name ?? 'Canal',
          }
        : location.pathname.endsWith('/gerenciar')
          ? {
              description: 'Categorias, canais, cargos e permissões',
              icon: Settings,
              title: 'Organizar servidor',
            }
          : location.pathname.endsWith('/configuracoes')
            ? {
                description: 'Identidade, propriedade e exclusão segura',
                icon: Settings,
                title: 'Configurações do servidor',
              }
            : {
                description: 'Canais, membros e convites',
                icon: ServerGlyph,
                title: currentServer?.server_name ?? 'Servidor',
              }
    : location.pathname.startsWith('/app/servidores')
      ? {
          description: 'Crie ou entre em comunidades privadas',
          icon: ServerGlyph,
          title: 'Servidores',
        }
      : location.pathname.startsWith('/app/convite/')
        ? {
            description: 'Validação segura antes de entrar',
            icon: UserRound,
            title: 'Convite',
          }
        : location.pathname.startsWith('/app/notificacoes')
          ? {
              description: 'Mensagens, menções, amizades e moderação',
              icon: Bell,
              title: 'Notificações',
            }
          : location.pathname.startsWith('/app/mensagens')
            ? {
                description: 'Conversas individuais protegidas',
                icon: MessageCircle,
                title: 'Mensagens privadas',
              }
            : location.pathname.startsWith('/app/conexoes')
              ? {
                  description: 'Amigos, pedidos e pessoas para conhecer',
                  icon: Users,
                  title: 'Conexões',
                }
              : location.pathname.startsWith('/app/pessoas/')
                ? {
                    description: 'Perfil público e informações compartilhadas',
                    icon: UserRound,
                    title: 'Perfil',
                  }
                : location.pathname.startsWith('/app/perfil/editar')
                  ? {
                      description: 'Avatar, interesses, privacidade e música',
                      icon: Settings,
                      title: 'Editar perfil',
                    }
                  : location.pathname.startsWith('/app/perfil')
                    ? {
                        description: 'Sua identidade e as escolhas que você decidiu compartilhar',
                        icon: UserRound,
                        title: 'Meu perfil',
                      }
                    : location.pathname.startsWith('/app/conta')
                      ? {
                          description: 'Sessão, senha e exclusão da conta',
                          icon: Settings,
                          title: 'Conta e segurança',
                        }
                      : {
                          description: 'Seu ponto de partida no Crypt',
                          icon: Home,
                          title: 'Início',
                        };
  const HeaderIcon = pageHeader.icon;

  async function handleSignOut() {
    try {
      await signOut();
      addToast({
        message: 'Sua sessão foi encerrada somente neste dispositivo.',
        title: 'Você saiu do Crypt',
        tone: 'info',
      });
      void navigate('/login', { replace: true });
    } catch {
      addToast({
        message: 'Conecte o celular à internet para remover os avisos desta conta com segurança.',
        title: 'Não foi possível sair agora',
        tone: 'error',
      });
    }
  }

  return (
    <div
      className={classNames(
        'app-shell h-dvh min-h-0 overflow-hidden bg-crypt-background text-crypt-text lg:grid lg:grid-cols-[4.5rem_17rem_minmax(0,1fr)]',
        !isVoiceRoute && '2xl:grid-cols-[4.5rem_17rem_minmax(0,1fr)_15rem]',
      )}
    >
      <aside
        aria-label="Seus espaços"
        className="app-shell__rail hidden border-r border-white/5 bg-crypt-deep px-2 py-4 lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:items-center lg:overflow-hidden"
      >
        <NavLink
          aria-label="Início do Crypt"
          className="grid size-12 place-items-center rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
          to="/app"
        >
          <img alt="" aria-hidden="true" className="size-12" src="/crypt-mark.svg" />
        </NavLink>
        <div className="my-4 h-px w-8 bg-white/10" />
        <div className="grid gap-3">
          {(serversQuery.data ?? []).map((server) => (
            <NavLink
              aria-label={server.server_name}
              className="group relative rounded-2xl transition hover:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
              key={server.server_id}
              to={`/app/servidores/${server.server_id}`}
            >
              {({ isActive }) => (
                <>
                  <ServerIcon iconPath={server.icon_path} name={server.server_name} size="sm" />
                  {isActive ? (
                    <span className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
          <NavLink
            aria-label="Criar servidor"
            className="grid size-11 place-items-center rounded-2xl border border-dashed border-white/15 text-crypt-muted transition hover:rounded-xl hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
            to="/app/servidores?criar=1"
          >
            <Plus aria-hidden="true" size={18} />
          </NavLink>
        </div>
        <div className="mt-auto">
          <button
            aria-expanded={currentServer ? globalMenuOpen : undefined}
            aria-label={currentServer ? 'Abrir menu do Crypt' : 'Abrir configurações da conta'}
            className="grid size-10 place-items-center rounded-xl text-crypt-muted transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
            onClick={() =>
              currentServer ? setGlobalMenuOpen((open) => !open) : void navigate('/app/conta')
            }
            type="button"
          >
            <Settings aria-hidden="true" size={18} />
          </button>
        </div>
      </aside>

      <aside
        aria-label={currentServer ? `Canais de ${currentServer.server_name}` : 'Navegação do Crypt'}
        className="app-shell__sidebar hidden border-r border-white/5 bg-crypt-sidebar lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden"
      >
        <div className="border-b border-white/5 px-4 py-4">
          <p className="text-xs font-medium text-violet-300">
            {currentServer ? 'Servidor atual' : 'Navegação'}
          </p>
          <h1 className="mt-1 truncate font-semibold text-white">
            {currentServer?.server_name ?? 'Crypt'}
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {currentServer && selectedServerId ? (
            <>
              <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
                Visão geral
              </p>
              <div className="mt-2 grid gap-1">
                <NavLink
                  className={({ isActive }) =>
                    classNames(
                      'flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
                      isActive
                        ? 'bg-white/[0.09] font-medium text-white'
                        : 'text-crypt-muted hover:bg-white/[0.05] hover:text-white',
                    )
                  }
                  end
                  to={`/app/servidores/${selectedServerId}`}
                >
                  <ServerGlyph aria-hidden="true" size={17} />
                  <span>Início do servidor</span>
                </NavLink>
                {canManageWorkspace ? (
                  <NavLink
                    className={({ isActive }) =>
                      classNames(
                        'flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition',
                        isActive
                          ? 'bg-white/[0.09] font-medium text-white'
                          : 'text-crypt-muted hover:bg-white/[0.05] hover:text-white',
                      )
                    }
                    to={`/app/servidores/${selectedServerId}/gerenciar`}
                  >
                    <Settings aria-hidden="true" size={17} />
                    <span>Organizar servidor</span>
                  </NavLink>
                ) : null}
                {currentServer.is_owner ? (
                  <NavLink
                    className={({ isActive }) =>
                      classNames(
                        'flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition',
                        isActive
                          ? 'bg-white/[0.09] font-medium text-white'
                          : 'text-crypt-muted hover:bg-white/[0.05] hover:text-white',
                      )
                    }
                    to={`/app/servidores/${selectedServerId}/configuracoes`}
                  >
                    <Settings aria-hidden="true" size={17} />
                    <span>Configurações</span>
                  </NavLink>
                ) : null}
              </div>

              <ChannelNavigation
                categories={serverCategories}
                channels={serverChannels}
                serverId={selectedServerId}
                unread={serverUnread}
                voicePresence={voicePresenceQuery.data ?? []}
              />
            </>
          ) : null}

          {!currentServer || globalMenuOpen ? (
            <div
              className={classNames(
                currentServer &&
                  'mt-6 rounded-2xl border border-violet-400/15 bg-violet-500/[0.055] p-2',
              )}
            >
              <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
                {currentServer ? 'Menu do Crypt' : 'Crypt'}
              </p>
              <div className="mt-2 grid gap-1">
                {channelLinks.map((channel) => {
                  const Icon = channel.icon;

                  return (
                    <NavLink
                      className={({ isActive }) =>
                        classNames(
                          'flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
                          isActive
                            ? 'bg-white/[0.09] font-medium text-white'
                            : 'text-crypt-muted hover:bg-white/[0.05] hover:text-white',
                        )
                      }
                      end={channel.end}
                      key={channel.to}
                      onClick={() => setGlobalMenuOpen(false)}
                      to={channel.to}
                    >
                      <Icon aria-hidden="true" size={17} />
                      <span className="min-w-0 flex-1">{channel.label}</span>
                      {channel.to === '/app/mensagens' && unreadDirectMessages ? (
                        <span className="grid min-w-5 place-items-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[0.62rem] font-semibold text-white">
                          {unreadDirectMessages > 99 ? '99+' : unreadDirectMessages}
                        </span>
                      ) : null}
                      {channel.to === '/app/notificacoes' && unreadNotifications ? (
                        <span className="grid min-w-5 place-items-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[0.62rem] font-semibold text-white">
                          {unreadNotifications > 99 ? '99+' : unreadNotifications}
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
              <p className="mt-5 px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
                Descoberta
              </p>
              <NavLink
                className="mt-2 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-crypt-muted transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
                onClick={() => setGlobalMenuOpen(false)}
                to="/app/conexoes?aba=discover"
              >
                <Compass aria-hidden="true" size={17} />
                Descobrir pessoas
              </NavLink>
            </div>
          ) : null}
        </nav>

        <VoiceCallPanel />

        <div className="m-3 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-3">
          <ProfileAvatar
            avatarPath={profileQuery.data?.avatar_path ?? null}
            displayName={displayName}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-emerald-300">{identityLabel}</p>
          </div>
          <div className="ml-auto flex">
            <NavLink
              aria-label="Abrir conta e segurança"
              className="grid size-8 place-items-center rounded-lg text-crypt-muted hover:bg-white/[0.07] hover:text-white"
              to="/app/conta"
            >
              <Settings aria-hidden="true" size={16} />
            </NavLink>
            <IconButton
              icon={<LogOut aria-hidden="true" size={16} />}
              label="Sair neste dispositivo"
              onClick={() => void handleSignOut()}
              size="sm"
            />
          </div>
        </div>
      </aside>

      <section className="app-shell__main flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="app-shell__header flex min-h-16 shrink-0 items-center gap-3 border-b border-white/5 bg-crypt-background/90 px-4 backdrop-blur-xl sm:px-5">
          <div className="lg:hidden">
            <IconButton
              icon={<Menu aria-hidden="true" size={20} />}
              label="Abrir espaços"
              onClick={() => void navigate('/app/servidores')}
            />
          </div>
          <span className="grid size-9 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
            <HeaderIcon aria-hidden="true" size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">{pageHeader.title}</h2>
            <p className="hidden truncate text-xs text-crypt-subtle sm:block">
              {pageHeader.description}
            </p>
          </div>
          {desktopRuntime ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-blue-400/15 bg-blue-500/[0.08] px-2.5 py-1 text-[0.66rem] font-semibold text-blue-200 sm:inline-flex">
              <Monitor aria-hidden="true" size={12} />
              Aplicativo Windows
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            <IconButton
              icon={<Search aria-hidden="true" size={18} />}
              label="Pesquisar neste canal"
            />
            <DesktopUpdateHeaderButton />
            <AndroidUpdateHeaderButton />
            <NavLink
              aria-label={
                unreadNotifications
                  ? `Notificações: ${unreadNotifications} não lidas`
                  : 'Notificações'
              }
              className="relative grid size-10 place-items-center rounded-xl text-crypt-muted transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
              to="/app/notificacoes"
            >
              <Bell aria-hidden="true" size={18} />
              {unreadNotifications ? (
                <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-crypt-background bg-violet-400" />
              ) : null}
            </NavLink>
            {!isVoiceRoute ? (
              <IconButton
                aria-expanded={membersOpen}
                className="hidden sm:inline-flex 2xl:hidden"
                icon={<Users aria-hidden="true" size={18} />}
                label="Mostrar membros"
                onClick={() => setMembersOpen((open) => !open)}
              />
            ) : null}
          </div>
        </header>

        {currentServer && selectedServerId ? (
          <nav
            aria-label={`Canais móveis de ${currentServer.server_name}`}
            className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/5 bg-crypt-sidebar/70 px-3 py-2 lg:hidden"
          >
            <NavLink
              className={({ isActive }) =>
                classNames(
                  'flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs',
                  isActive ? 'bg-white/[0.1] text-white' : 'bg-white/[0.035] text-crypt-muted',
                )
              }
              end
              to={`/app/servidores/${selectedServerId}`}
            >
              <ServerGlyph size={14} />
              Início
            </NavLink>
            {serverChannels.map((channel) => (
              <NavLink
                className={({ isActive }) =>
                  classNames(
                    'flex min-h-9 max-w-52 shrink-0 items-center gap-2 rounded-xl px-3 text-xs',
                    isActive ? 'bg-white/[0.1] text-white' : 'bg-white/[0.035] text-crypt-muted',
                  )
                }
                key={channel.channel_id}
                to={
                  channel.channel_type === 'voice' || channel.channel_type === 'video'
                    ? `/app/servidores/${selectedServerId}/chamadas/${channel.channel_id}`
                    : `/app/servidores/${selectedServerId}/canais/${channel.channel_id}`
                }
              >
                <span>{channel.channel_icon ?? '#'}</span>
                <span className="truncate">{channel.channel_name}</span>
                {serverUnread.find((item) => item.channel_id === channel.channel_id)
                  ?.mention_count ? (
                  <span className="rounded-full bg-violet-500 px-1.5 text-[0.6rem] text-white">
                    {
                      serverUnread.find((item) => item.channel_id === channel.channel_id)
                        ?.mention_count
                    }
                  </span>
                ) : null}
              </NavLink>
            ))}
            {canManageWorkspace ? (
              <NavLink
                className={({ isActive }) =>
                  classNames(
                    'flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs',
                    isActive ? 'bg-white/[0.1] text-white' : 'bg-white/[0.035] text-crypt-muted',
                  )
                }
                to={`/app/servidores/${selectedServerId}/gerenciar`}
              >
                <Settings size={14} />
                Organizar
              </NavLink>
            ) : null}
          </nav>
        ) : null}

        <div
          className={classNames(
            'app-shell__content min-h-0 flex-1 pb-[4.75rem] lg:pb-0',
            isConversationRoute
              ? 'app-shell__content--conversation overflow-hidden'
              : 'overflow-y-auto',
          )}
        >
          <Outlet />
        </div>

        {membersOpen && currentServer ? (
          <aside
            aria-label={`Membros de ${currentServer.server_name}`}
            className="fixed bottom-[4.75rem] right-0 top-16 z-40 w-[min(20rem,92vw)] overflow-y-auto border-l border-white/10 bg-crypt-sidebar px-4 py-5 shadow-2xl 2xl:hidden"
          >
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
                Membros — {serverMembers.length}
              </p>
              <IconButton
                icon={<X aria-hidden="true" size={17} />}
                label="Fechar membros"
                onClick={() => setMembersOpen(false)}
                size="sm"
              />
            </div>
            <ServerMemberGroups
              assignments={serverMemberRoles}
              members={serverMembers}
              roles={serverRoles}
            />
          </aside>
        ) : null}

        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-crypt-deep/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
        >
          <NavLink
            className={({ isActive }) =>
              classNames(
                'grid min-h-12 place-items-center gap-0.5 rounded-xl text-[0.65rem] font-medium',
                isActive ? 'text-violet-200' : 'text-crypt-subtle',
              )
            }
            to="/app/servidores"
          >
            <ServerGlyph aria-hidden="true" size={19} />
            Servidores
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              classNames(
                'grid min-h-12 place-items-center gap-0.5 rounded-xl text-[0.65rem] font-medium',
                isActive ? 'text-violet-200' : 'text-crypt-subtle',
              )
            }
            end
            to="/app"
          >
            <Home aria-hidden="true" size={19} />
            Início
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              classNames(
                'relative grid min-h-12 place-items-center gap-0.5 rounded-xl text-[0.65rem] font-medium',
                isActive ? 'text-violet-200' : 'text-crypt-subtle',
              )
            }
            to="/app/mensagens"
          >
            <MessageCircle aria-hidden="true" size={19} />
            Mensagens
            {unreadDirectMessages ? (
              <span className="absolute right-2 top-0 grid min-w-5 place-items-center rounded-full bg-violet-500 px-1 text-[0.58rem] text-white">
                {unreadDirectMessages > 99 ? '99+' : unreadDirectMessages}
              </span>
            ) : null}
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              classNames(
                'grid min-h-12 place-items-center gap-0.5 rounded-xl text-[0.65rem] font-medium',
                isActive ? 'text-violet-200' : 'text-crypt-subtle',
              )
            }
            to="/app/conexoes"
          >
            <Users aria-hidden="true" size={19} />
            Amigos
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              classNames(
                'grid min-h-12 place-items-center gap-0.5 rounded-xl text-[0.65rem] font-medium',
                isActive ? 'text-violet-200' : 'text-crypt-subtle',
              )
            }
            to="/app/perfil"
          >
            <UserRound aria-hidden="true" size={19} />
            Perfil
          </NavLink>
        </nav>
      </section>

      <aside
        aria-label={currentServer ? `Membros de ${currentServer.server_name}` : 'Painel contextual'}
        className={classNames(
          'app-shell__members hidden min-h-0 overflow-y-auto border-l border-white/5 bg-crypt-sidebar px-4 py-5',
          !isVoiceRoute && '2xl:block 2xl:h-dvh',
        )}
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
          {currentServer ? `Membros — ${serverMembers.length}` : 'Servidores'}
        </p>
        {currentServer ? (
          <ServerMemberGroups
            assignments={serverMemberRoles}
            members={serverMembers}
            roles={serverRoles}
          />
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-xs leading-5 text-crypt-subtle">
            Selecione um servidor para acompanhar os membros em tempo real.
          </div>
        )}
      </aside>
    </div>
  );
}

function getServerIdFromPath(pathname: string) {
  return pathname.match(/^\/app\/servidores\/([0-9a-f-]{36})(?:\/|$)/i)?.[1] ?? null;
}

function getChannelIdFromPath(pathname: string) {
  return pathname.match(/\/(?:canais|chamadas)\/([0-9a-f-]{36})(?:\/|$)/i)?.[1] ?? null;
}

function ChannelNavigation({
  categories,
  channels,
  serverId,
  unread,
  voicePresence,
}: {
  categories: ServerCategory[];
  channels: ServerChannel[];
  serverId: string;
  unread: ChannelUnread[];
  voicePresence: VoicePresenceEntry[];
}) {
  const groups: Array<{ id: string; label: string; values: ServerChannel[] }> = [
    {
      id: 'uncategorized',
      label: 'Canais',
      values: channels.filter((channel) => !channel.category_id),
    },
    ...categories.map((category) => ({
      id: category.category_id,
      label: category.category_name,
      values: channels.filter((channel) => channel.category_id === category.category_id),
    })),
  ].filter((group) => group.values.length > 0);

  return (
    <div className="mt-7 grid gap-5">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
            {group.label}
          </p>
          <div className="mt-2 grid gap-1">
            {group.values.map((channel) => {
              const unreadState = unread.find((item) => item.channel_id === channel.channel_id);

              return (
                <div key={channel.channel_id}>
                  <NavLink
                    className={({ isActive }) =>
                      classNames(
                        'flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm transition',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
                        isActive
                          ? 'bg-white/[0.09] font-medium text-white'
                          : unreadState?.unread_count
                            ? 'font-medium text-white hover:bg-white/[0.05]'
                            : 'text-crypt-muted hover:bg-white/[0.05] hover:text-white',
                      )
                    }
                    to={
                      channel.channel_type === 'voice' || channel.channel_type === 'video'
                        ? `/app/servidores/${serverId}/chamadas/${channel.channel_id}`
                        : `/app/servidores/${serverId}/canais/${channel.channel_id}`
                    }
                  >
                    <span aria-hidden="true" className="w-5 shrink-0 text-center">
                      {channel.channel_icon ?? '#'}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{channel.channel_name}</span>
                    {unreadState?.mention_count ? (
                      <span className="grid min-w-5 place-items-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[0.62rem] font-bold text-white">
                        {Math.min(unreadState.mention_count, 99)}
                      </span>
                    ) : unreadState?.unread_count ? (
                      <span
                        aria-label={`${unreadState.unread_count} mensagens não lidas`}
                        className="size-2 rounded-full bg-white"
                      />
                    ) : null}
                  </NavLink>
                  {channel.channel_type === 'voice' || channel.channel_type === 'video' ? (
                    <VoiceChannelPresence
                      channelId={channel.channel_id}
                      members={voicePresence.filter(
                        (presence) => presence.channel_id === channel.channel_id,
                      )}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
