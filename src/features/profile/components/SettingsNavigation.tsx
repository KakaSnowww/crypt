import { ShieldCheck, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { classNames } from '../../../lib/classNames';

const settingsLinks = [
  {
    description: 'Avatar, banner, interesses e privacidade',
    icon: UserRound,
    label: 'Editar perfil',
    to: '/app/perfil/editar',
  },
  {
    description: 'Versão, senha, sessão e exclusão da conta',
    icon: ShieldCheck,
    label: 'Conta e segurança',
    to: '/app/conta',
  },
] as const;

export function SettingsNavigation() {
  return (
    <nav
      aria-label="Seções das configurações"
      className="mb-8 grid gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2 sm:grid-cols-2"
    >
      {settingsLinks.map((link) => {
        const Icon = link.icon;

        return (
          <NavLink
            className={({ isActive }) =>
              classNames(
                'flex min-h-16 items-center gap-3 rounded-xl px-4 py-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
                isActive
                  ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20'
                  : 'text-crypt-muted hover:bg-white/[0.05] hover:text-white',
              )
            }
            end
            key={link.to}
            to={link.to}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-violet-200">
              <Icon aria-hidden="true" size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{link.label}</span>
              <span className="mt-0.5 block text-xs leading-4 text-crypt-subtle">
                {link.description}
              </span>
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
