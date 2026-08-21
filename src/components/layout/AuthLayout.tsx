import {
  Activity,
  Binary,
  Braces,
  CheckCircle2,
  CircleDot,
  Code2,
  Gamepad2,
  Radio,
  ShieldCheck,
  Terminal,
  Users,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { Brand } from './Brand';

const capabilityNodes = [
  { icon: Users, label: 'Comunidades', value: 'LIVE' },
  { icon: Radio, label: 'Voz e vídeo', value: '48 KHZ' },
  { icon: Gamepad2, label: 'Transmissões', value: 'HD60' },
] as const;

const bootSequence = [
  ['01', 'Identidade protegida', 'READY'],
  ['02', 'Rede em tempo real', 'ONLINE'],
  ['03', 'Espaços sincronizados', 'SYNC'],
] as const;

export function AuthLayout() {
  return (
    <main className="auth-v4 h-dvh min-h-0 overflow-hidden">
      <div aria-hidden="true" className="auth-v4__backdrop">
        <span className="auth-v4__grid" />
        <span className="auth-v4__flare auth-v4__flare--violet" />
        <span className="auth-v4__flare auth-v4__flare--cyan" />
      </div>

      <header className="auth-v4__topbar">
        <Brand subtitle="Realtime Community OS" />
        <div className="auth-v4__system-state">
          <span />
          <strong>CRYPT NETWORK</strong>
          <small>OPERATIONAL</small>
        </div>
      </header>

      <div className="auth-v4__stage">
        <section className="auth-v4__manifesto" aria-labelledby="auth-manifesto-title">
          <div className="auth-v4__chapter">
            <span>BUILD // PLAY // CONNECT</span>
            <span>12.0</span>
          </div>

          <div className="auth-v4__headline">
            <p>
              <Code2 aria-hidden="true" size={15} /> UMA REDE PARA QUEM CRIA
            </p>
            <h1 id="auth-manifesto-title">
              Entre no seu
              <span>próximo universo.</span>
            </h1>
            <p className="auth-v4__copy">
              Calls, comunidades, jogos e projetos em uma interface construída para desaparecer
              quando você está focado — e impressionar quando você olha.
            </p>
          </div>

          <div className="auth-v4__capabilities" aria-label="Recursos principais">
            {capabilityNodes.map(({ icon: Icon, label, value }, index) => (
              <article
                key={label}
                style={{ '--auth-node-delay': `${index * 90}ms` } as CSSProperties}
              >
                <span>
                  <Icon aria-hidden="true" size={17} />
                </span>
                <div>
                  <strong>{label}</strong>
                  <small>{value}</small>
                </div>
              </article>
            ))}
          </div>

          <div className="auth-v4__terminal" aria-hidden="true">
            <header>
              <span>
                <Terminal size={13} /> crypt://boot
              </span>
              <Activity size={14} />
            </header>
            <div>
              {bootSequence.map(([step, label, state]) => (
                <p key={step}>
                  <b>{step}</b>
                  <span>{label}</span>
                  <em>{state}</em>
                </p>
              ))}
            </div>
          </div>
        </section>

        <div aria-hidden="true" className="auth-v4__link">
          <span className="auth-v4__link-source">
            <Braces size={16} />
          </span>
          <i />
          <span className="auth-v4__packet auth-v4__packet--one" />
          <span className="auth-v4__packet auth-v4__packet--two" />
          <span className="auth-v4__link-target">
            <Binary size={16} />
          </span>
        </div>

        <section className="auth-v4__portal" aria-label="Área de acesso">
          <div className="auth-v4__portal-shell">
            <header className="auth-v4__portal-header">
              <div>
                <CircleDot aria-hidden="true" size={14} />
                <span>SECURE SESSION</span>
              </div>
              <span className="auth-v4__latency">18 MS</span>
            </header>

            <div className="auth-v4__portal-content">
              <Brand className="auth-v4__mobile-brand" subtitle="Realtime Community OS" />
              <Outlet />
            </div>

            <footer className="auth-v4__portal-footer">
              <span>
                <ShieldCheck aria-hidden="true" size={13} /> TLS ACTIVE
              </span>
              <span>
                <CheckCircle2 aria-hidden="true" size={13} /> AUTH READY
              </span>
            </footer>
          </div>
        </section>
      </div>

      <footer className="auth-v4__footer">
        <span>CRYPT 0.12.0 // REBUILD PREVIEW</span>
        <span>WINDOWS · ANDROID · WEB</span>
      </footer>
    </main>
  );
}
