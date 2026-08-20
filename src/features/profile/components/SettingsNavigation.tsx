import { Link2, ShieldCheck, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { classNames } from '../../../lib/classNames';

const settingsLinks = [
  {
    description: 'Spotify, Steam, YouTube e atividade',
    icon: Link2,
    label: 'Contas conectadas',
    to: '/app/configuracoes/conexoes',
  },
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
      className="settings-chapters mb-8 grid gap-2 p-2 sm:grid-cols-3"
    >
      {settingsLinks.map((link) => {
        const Icon = link.icon;

        return (
          <NavLink
            className={({ isActive }) =>
              classNames(
                'settings-chapter flex min-h-16 items-center gap-3 rounded-xl px-4 py-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
                isActive ? 'is-active text-white' : 'text-crypt-muted hover:text-white',
              )
            }
            end
            key={link.to}
            to={link.to}
          >
            <span className="settings-chapter-icon grid size-9 shrink-0 place-items-center rounded-xl">
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
