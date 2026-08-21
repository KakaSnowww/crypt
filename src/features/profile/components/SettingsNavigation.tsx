import { Link2, ShieldCheck, UserRound } from 'lucide-react';
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
    description: 'Spotify, Steam, YouTube e atividade',
    icon: Link2,
    label: 'Contas conectadas',
    to: '/app/configuracoes/conexoes',
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
    <aside className="settings-sidebar">
      <div className="settings-sidebar__heading">
        <span>CRYPT</span>
        <strong>Configurações</strong>
        <p>Controle sua identidade, integrações e segurança.</p>
      </div>
      <nav aria-label="Seções das configurações" className="settings-chapters">
        {settingsLinks.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                classNames(
                  'settings-chapter',
                  isActive ? 'is-active text-white' : 'text-crypt-muted hover:text-white',
                )
              }
              end
              key={link.to}
              to={link.to}
            >
              <span className="settings-chapter-icon">
                <Icon aria-hidden="true" size={17} />
              </span>
              <span className="min-w-0">
                <span>{link.label}</span>
                <small>{link.description}</small>
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
