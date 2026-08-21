import { Activity, CheckCircle2, Code2, Gamepad2, LockKeyhole, Radio, Users } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Brand } from './Brand';

const benefits = [
  {
    icon: Users,
    text: 'Comunidades, amizades e conversas em um espaço realmente seu.',
  },
  {
    icon: LockKeyhole,
    text: 'Privacidade, cargos e permissões com controle em cada camada.',
  },
  {
    icon: Gamepad2,
    text: 'Uma experiência rápida para navegador, Windows e Android.',
  },
] as const;

const networkNodes = [
  { className: 'is-primary', label: 'CRYPT_01', status: 'ONLINE' },
  { className: 'is-secondary', label: 'DEV_ROOM', status: '24 ACTIVE' },
  { className: 'is-tertiary', label: 'SQUAD', status: 'VOICE' },
] as const;

export function AuthLayout() {
  return (
    <main className="crypt-auth-layout cyber-auth grid h-dvh min-h-0 overflow-hidden lg:grid-cols-[minmax(0,1.13fr)_minmax(28rem,0.87fr)]">
      <section className="crypt-auth-story cyber-auth__story relative hidden h-full overflow-hidden border-r border-white/[0.06] p-10 lg:flex lg:flex-col xl:p-14">
        <div aria-hidden="true" className="cyber-auth__grid" />
        <div aria-hidden="true" className="cyber-auth__beam" />
        <div aria-hidden="true" className="cyber-auth__noise" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <Brand subtitle="Community OS" />
          <div className="cyber-auth__live flex items-center gap-2">
            <span aria-hidden="true" />
            NETWORK ONLINE
          </div>
        </div>

        <div className="relative z-10 my-auto grid items-center gap-8 py-8 xl:grid-cols-[minmax(0,0.88fr)_minmax(20rem,1.12fr)]">
          <div className="max-w-xl">
            <p className="cyber-auth__eyebrow flex items-center gap-2">
              <Code2 size={14} />
              BUILT FOR PLAYERS &amp; BUILDERS
            </p>
            <h1 className="crypt-auth-title mt-5 text-5xl font-black leading-[0.98] tracking-[-0.065em] xl:text-6xl">
              Seu squad.
              <br />
              Seu código.
              <span> Seu espaço.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-crypt-muted">
              O Crypt conecta comunidades, chamadas e ideias em uma plataforma criada para quem
              joga, desenvolve e constrói junto.
            </p>

            <ul className="mt-10 grid gap-4">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <li
                    className="crypt-auth-benefit flex items-start gap-3 text-sm leading-6 text-crypt-muted"
                    key={benefit.text}
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl">
                      <Icon aria-hidden="true" size={15} />
                    </span>
                    {benefit.text}
                  </li>
                );
              })}
            </ul>
          </div>

          <div aria-hidden="true" className="cyber-auth__visual">
            <div className="cyber-auth__window">
              <div className="cyber-auth__window-bar">
                <span />
                <span />
                <span />
                <p>crypt://network/live</p>
                <Activity size={13} />
              </div>
              <div className="cyber-auth__network">
                <span className="cyber-auth__route cyber-auth__route--one" />
                <span className="cyber-auth__route cyber-auth__route--two" />
                <span className="cyber-auth__route cyber-auth__route--three" />
                <div className="cyber-auth__core">
                  <span className="cyber-auth__core-ring" />
                  <img alt="" src="/crypt-mark.svg" />
                </div>
                {networkNodes.map((node) => (
                  <div className={`cyber-auth__node ${node.className}`} key={node.label}>
                    <Radio size={12} />
                    <span>{node.label}</span>
                    <strong>{node.status}</strong>
                  </div>
                ))}
                <div className="cyber-auth__code">
                  <span>
                    <b>01</b> const network = <i>'crypt'</i>;
                  </span>
                  <span>
                    <b>02</b> await squad.connect();
                  </span>
                  <span>
                    <b>03</b> status: <em>online</em>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 flex items-center gap-2 text-xs text-crypt-subtle">
          <CheckCircle2 aria-hidden="true" size={15} />
          Crypt 0.11.0 — secure community network
        </p>
      </section>

      <section
        aria-label="Área de acesso"
        className="crypt-auth-access relative h-full min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8"
      >
        <div aria-hidden="true" className="cyber-auth__access-grid" />
        <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col justify-center py-6 sm:py-10">
          <div className="cyber-auth__access-meta mb-4 flex items-center justify-between px-1 text-[0.65rem] font-bold tracking-[0.18em]">
            <span>SECURE ACCESS</span>
            <span className="flex items-center gap-1.5">
              <i /> ENCRYPTED
            </span>
          </div>
          <div className="auth-surface p-5 sm:p-8 lg:p-9">
            <Brand className="mb-10 lg:hidden" subtitle="Community OS" />
            <Outlet />
          </div>
        </div>
      </section>
    </main>
  );
}
