import { CheckCircle2, LockKeyhole, Sparkles, Users } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Brand } from './Brand';

const benefits = [
  {
    icon: Users,
    text: 'Encontre pessoas pelos interesses que vocês compartilham.',
  },
  {
    icon: LockKeyhole,
    text: 'Privacidade e permissões aplicadas desde a fundação.',
  },
  {
    icon: Sparkles,
    text: 'Uma experiência própria para navegador, Windows e Android.',
  },
] as const;

export function AuthLayout() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
      <section className="relative hidden overflow-hidden border-r border-white/5 p-12 lg:flex lg:flex-col xl:p-16">
        <div
          aria-hidden="true"
          className="absolute -left-40 top-20 size-[30rem] rounded-full bg-violet-600/20 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-52 right-[-6rem] size-[32rem] rounded-full bg-blue-600/15 blur-[120px]"
        />

        <Brand className="relative" />

        <div className="relative my-auto max-w-xl py-16">
          <p className="eyebrow">Bem-vindo ao seu espaço</p>
          <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-[-0.05em] text-white xl:text-6xl">
            Conversas que começam com algo em comum.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-crypt-muted">
            O Crypt aproxima comunidades, amizades e interesses em uma interface calma, moderna e
            feita para pertencer.
          </p>

          <ul className="mt-10 grid gap-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <li
                  className="flex items-start gap-3 text-sm leading-6 text-crypt-muted"
                  key={benefit.text}
                >
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-300">
                    <Icon aria-hidden="true" size={15} />
                  </span>
                  {benefit.text}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-crypt-subtle">
          <CheckCircle2 aria-hidden="true" size={15} />
          Fase 5 — amizades, descoberta e privacidade
        </p>
      </section>

      <section className="relative grid min-h-dvh place-items-center px-5 py-10 sm:px-8">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[-14rem] size-[26rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[100px] lg:hidden"
        />
        <div className="relative w-full max-w-md">
          <Brand className="mb-12 lg:hidden" />
          <Outlet />
        </div>
      </section>
    </main>
  );
}
