import { Link2, ShieldCheck, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { classNames } from '../../../lib/classNames';

const settingsLinks = [
  {
    description: 'Avatar, banner, interesses e privacidade',
    icon: UserRound,
    index: '01',
    label: 'Identidade',
    to: '/app/perfil/editar',
  },
  {
    description: 'Spotify, Steam, YouTube e atividade',
    icon: Link2,
    index: '02',
    label: 'Integrações',
    to: '/app/configuracoes/conexoes',
  },
  {
    description: 'Versão, senha, sessão e exclusão da conta',
    icon: ShieldCheck,
    index: '03',
    label: 'Sistema e segurança',
    to: '/app/conta',
  },
] as const;

export function SettingsNavigation() {
  return (
    <aside className="settings-v4-nav">
      <div className="settings-v4-nav__heading">
        <span>CONTROL CENTER</span>
        <strong>Seu Crypt</strong>
        <p>Identidade, conexões e sistema em um único painel.</p>
      </div>
      <nav aria-label="Seções das configurações" className="settings-v4-nav__links">
        {settingsLinks.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                classNames(
                  'settings-v4-nav__link',
                  isActive ? 'is-active text-white' : 'text-crypt-muted hover:text-white',
                )
              }
              end
              key={link.to}
              to={link.to}
            >
              <span className="settings-v4-nav__index">{link.index}</span>
              <span className="settings-v4-nav__icon">
                <Icon aria-hidden="true" size={17} />
              </span>
              <span className="settings-v4-nav__copy">
                <strong>{link.label}</strong>
                <small>{link.description}</small>
              </span>
              <i />
            </NavLink>
          );
        })}
      </nav>
      <div className="settings-v4-nav__status">
        <span />
        <div>
          <strong>Sistema sincronizado</strong>
          <small>Preferências salvas automaticamente</small>
        </div>
      </div>
    </aside>
  );
}
