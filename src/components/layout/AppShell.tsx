import {
  Bell,
  BookOpen,
  Compass,
  Hash,
  Home,
  Menu,
  MessageCircle,
  Palette,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { classNames } from '../../lib/classNames';
import { IconButton } from '../common/IconButton';

const spaces = [
  { color: 'from-violet-500 to-blue-500', label: 'Órbita do Snow', shortLabel: 'OS' },
  { color: 'from-fuchsia-500 to-rose-500', label: 'Jogos e histórias', shortLabel: 'JH' },
  { color: 'from-cyan-500 to-blue-500', label: 'Laboratório', shortLabel: 'LB' },
] as const;

const members = [
  { color: 'bg-violet-500', name: 'Kaio Snow', status: 'Criando o Crypt' },
  { color: 'bg-blue-500', name: 'Luna', status: 'Online' },
  { color: 'bg-emerald-500', name: 'Theo', status: 'Explorando' },
] as const;

const channelLinks = [
  {
    end: true,
    icon: Hash,
    label: 'Conversa Geral',
    to: '/app',
  },
  {
    end: false,
    icon: Palette,
    label: 'Base visual',
    to: '/app/componentes',
  },
] as const;

export function AppShell() {
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
          {spaces.map((space, index) => (
            <button
              aria-label={space.label}
              className={classNames(
                'group relative grid size-11 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br text-xs font-bold text-white shadow-lg transition',
                'hover:rounded-xl focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
                space.color,
              )}
              key={space.label}
              type="button"
            >
              {space.shortLabel}
              {index === 0 ? (
                <span className="absolute -left-2 h-6 w-1 rounded-r-full bg-white" />
              ) : null}
            </button>
          ))}
          <button
            aria-label="Criar espaço"
            className="grid size-11 place-items-center rounded-2xl border border-dashed border-white/15 text-crypt-muted transition hover:rounded-xl hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="mt-auto">
          <IconButton icon={<Settings aria-hidden="true" size={18} />} label="Configurações" />
        </div>
      </aside>

      <aside
        aria-label="Canais de Órbita do Snow"
        className="hidden border-r border-white/5 bg-crypt-sidebar lg:flex lg:min-h-dvh lg:flex-col"
      >
        <div className="border-b border-white/5 px-4 py-4">
          <p className="text-xs font-medium text-violet-300">Espaço atual</p>
          <h1 className="mt-1 truncate font-semibold text-white">Órbita do Snow</h1>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
            Conversas
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
          <div className="mt-2 grid gap-1">
            <button
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-crypt-muted transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
              type="button"
            >
              <Compass aria-hidden="true" size={17} />
              Pessoas
            </button>
            <button
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-crypt-muted transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
              type="button"
            >
              <BookOpen aria-hidden="true" size={17} />
              Interesses
            </button>
          </div>
        </nav>

        <div className="m-3 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
            KS
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Kaio Snow</p>
            <p className="truncate text-xs text-emerald-300">Base conectada</p>
          </div>
          <IconButton
            className="ml-auto"
            icon={<Settings aria-hidden="true" size={16} />}
            label="Configurações do perfil"
            size="sm"
          />
        </div>
      </aside>

      <section className="flex min-h-dvh min-w-0 flex-col">
        <header className="flex min-h-16 items-center gap-3 border-b border-white/5 bg-crypt-background/90 px-4 backdrop-blur-xl sm:px-5">
          <div className="lg:hidden">
            <IconButton icon={<Menu aria-hidden="true" size={20} />} label="Abrir espaços" />
          </div>
          <span className="grid size-9 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
            <Hash aria-hidden="true" size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">Conversa Geral</h2>
            <p className="hidden truncate text-xs text-crypt-subtle sm:block">
              Ideias, novidades e conversas da comunidade
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <IconButton
              icon={<Search aria-hidden="true" size={18} />}
              label="Pesquisar neste canal"
            />
            <IconButton icon={<Bell aria-hidden="true" size={18} />} label="Notificações" />
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
            end
            to="/app"
          >
            <Home aria-hidden="true" size={19} />
            Conversas
          </NavLink>
          <button
            className="grid min-h-12 place-items-center gap-0.5 rounded-xl text-[0.65rem] font-medium text-crypt-subtle"
            type="button"
          >
            <MessageCircle aria-hidden="true" size={19} />
            Mensagens
          </button>
          <button
            className="grid min-h-12 place-items-center gap-0.5 rounded-xl text-[0.65rem] font-medium text-crypt-subtle"
            type="button"
          >
            <Users aria-hidden="true" size={19} />
            Amigos
          </button>
          <NavLink
            className={({ isActive }) =>
              classNames(
                'grid min-h-12 place-items-center gap-0.5 rounded-xl text-[0.65rem] font-medium',
                isActive ? 'text-violet-200' : 'text-crypt-subtle',
              )
            }
            to="/app/componentes"
          >
            <Sparkles aria-hidden="true" size={19} />
            Sistema
          </NavLink>
        </nav>
      </section>

      <aside
        aria-label="Membros online"
        className="hidden border-l border-white/5 bg-crypt-sidebar px-4 py-5 2xl:block"
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-crypt-subtle">
          Online — {members.length}
        </p>
        <div className="mt-4 grid gap-2">
          {members.map((member) => (
            <button
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
              key={member.name}
              type="button"
            >
              <span
                className={classNames(
                  'relative grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold text-white',
                  member.color,
                )}
              >
                {member.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
                <span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-crypt-sidebar bg-emerald-400" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">{member.name}</span>
                <span className="block truncate text-xs text-crypt-subtle">{member.status}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
