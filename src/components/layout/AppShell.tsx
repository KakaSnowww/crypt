import {
  Bell,
  Compass,
  Crown,
  Hash,
  Home,
  LogOut,
  Menu,
  Palette,
  Plus,
  Search,
  Server as ServerGlyph,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../common/ToastContext';
import { useAuth } from '../../features/auth/useAuth';
import { useConnectionNotifications } from '../../features/connections/connections.queries';
import {
  useConnectionsRealtime,
  usePresenceHeartbeat,
} from '../../features/connections/useConnectionsRealtime';
import { ProfileAvatar } from '../../features/profile/components/ProfileAvatar';
import { useCurrentProfile } from '../../features/profile/profile.queries';
import { ServerIcon } from '../../features/servers/components/ServerIcon';
import {
  useMyServers,
  useServerMembers,
  useServerOverview,
} from '../../features/servers/servers.queries';
import { useServersRealtime } from '../../features/servers/useServersRealtime';
import { classNames } from '../../lib/classNames';
import { isSupabaseConfigured } from '../../lib/supabase/client';
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
] as const;

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const { signOut, user } = useAuth();
  const selectedServerId = getServerIdFromPath(location.pathname);
  const appDataEnabled = isSupabaseConfigured() && import.meta.env.MODE !== 'test';
  const profileQuery = useCurrentProfile(user?.id ?? null, appDataEnabled);
  const serversQuery = useMyServers(appDataEnabled);
  const serverOverviewQuery = useServerOverview(selectedServerId, appDataEnabled);
  const serverMembersQuery = useServerMembers(selectedServerId, appDataEnabled);
  const notificationsQuery = useConnectionNotifications(appDataEnabled);
  useConnectionsRealtime(user?.id ?? null);
  usePresenceHeartbeat(user?.id ?? null);
  useServersRealtime(user?.id ?? null, selectedServerId);
  const currentServer =
    serverOverviewQuery.data ??
    serversQuery.data?.find((server) => server.server_id === selectedServerId);
  const serverMembers = serverMembersQuery.data ?? [];
  const unreadNotifications =
    notificationsQuery.data?.filter((notification) => !notification.read_at).length ?? 0;
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
    ? location.pathname.endsWith('/configuracoes')
      ? {
          description: 'Identidade, propriedade e exclusão segura',
          icon: Settings,
          title: 'Configurações do servidor',
        }
      : {
          description: 'Canal inicial, membros e convites',
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
    await signOut();
    addToast({
      message: 'Sua sessão foi encerrada somente neste dispositivo.',
      title: 'Você saiu do Crypt',
      tone: 'info',
    });
    void navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-dvh bg-crypt-background text-crypt-text lg:grid lg:grid-cols-[4.5rem_17rem_minmax(0,1fr)] 2xl:grid-cols-[4.5rem_17rem_minmax(0,1fr)_15rem]">
      <aside
        aria-label="Seus espaços"
        className="hidden border-r border-white/5 bg-crypt-deep px-2 py-4 lg:flex lg:min-h-dvh lg:flex-col lg:items-center"
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
          <NavLink
            aria-label="Editar perfil"
            className="grid size-10 place-items-center rounded-xl text-crypt-muted transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
            to="/app/perfil/editar"
          >
            <Settings aria-hidden="true" size={18} />
          </NavLink>
        </div>
      </aside>

      <aside
        aria-label={currentServer ? `Canais de ${currentServer.server_name}` : 'Navegação do Crypt'}
        className="hidden border-r border-white/5 bg-crypt-sidebar lg:flex lg:min-h-dvh lg:flex-col"
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
                Canais
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
                  <Hash aria-hidden="true" size={17} />
                  <span>{currentServer.default_channel_name ?? 'Conversa Geral'}</span>
                </NavLink>
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
            </>
          ) : null}

          <p
            className={`${currentServer ? 'mt-7' : ''} px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle`}
          >
            Crypt
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
                  to={channel.to}
                >
                  <Icon aria-hidden="true" size={17} />
                  <span>{channel.label}</span>
                </NavLink>
              );
            })}
          </div>

          <p className="mt-7 px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
            Descoberta
          </p>
          <NavLink
            className="mt-2 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-crypt-muted transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
            to="/app/conexoes?aba=discover"
          >
            <Compass aria-hidden="true" size={17} />
            Descobrir pessoas
          </NavLink>
        </nav>

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
              aria-label="Editar perfil"
              className="grid size-8 place-items-center rounded-lg text-crypt-muted hover:bg-white/[0.07] hover:text-white"
              to="/app/perfil/editar"
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

      <section className="flex min-h-dvh min-w-0 flex-col">
        <header className="flex min-h-16 items-center gap-3 border-b border-white/5 bg-crypt-background/90 px-4 backdrop-blur-xl sm:px-5">
          <div className="lg:hidden">
            <IconButton icon={<Menu aria-hidden="true" size={20} />} label="Abrir espaços" />
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
          <div className="ml-auto flex items-center gap-1">
            <IconButton
              icon={<Search aria-hidden="true" size={18} />}
              label="Pesquisar neste canal"
            />
            <NavLink
              aria-label={
                unreadNotifications
                  ? `Notificações: ${unreadNotifications} não lidas`
                  : 'Notificações'
              }
              className="relative grid size-10 place-items-center rounded-xl text-crypt-muted transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
              to="/app/conexoes?aba=notifications"
            >
              <Bell aria-hidden="true" size={18} />
              {unreadNotifications ? (
                <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-crypt-background bg-violet-400" />
              ) : null}
            </NavLink>
            <IconButton
              className="hidden sm:inline-flex"
              icon={<Users aria-hidden="true" size={18} />}
              label="Mostrar membros"
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-[4.75rem] lg:pb-0">
          <Outlet />
        </div>

        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/10 bg-crypt-deep/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
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
        className="hidden border-l border-white/5 bg-crypt-sidebar px-4 py-5 2xl:block"
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
          {currentServer ? `Membros — ${serverMembers.length}` : 'Servidores'}
        </p>
        {currentServer ? (
          <div className="mt-4 grid gap-2">
            {serverMembers.map((member) => (
              <NavLink
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
                key={member.profile_id}
                to={`/app/pessoas/${member.handle}`}
              >
                <span className="relative">
                  <ProfileAvatar
                    avatarPath={member.avatar_path}
                    displayName={member.display_name}
                    size="sm"
                  />
                  <span
                    className={classNames(
                      'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-crypt-sidebar',
                      member.is_online ? 'bg-emerald-400' : 'bg-slate-500',
                    )}
                  />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 truncate text-sm font-medium text-white">
                    {member.display_name}
                    {member.is_owner ? (
                      <Crown aria-label="Proprietário" className="text-amber-300" size={12} />
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-crypt-subtle">
                    {member.is_online ? 'Online' : `@${member.handle}`}
                  </span>
                </span>
              </NavLink>
            ))}
          </div>
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
