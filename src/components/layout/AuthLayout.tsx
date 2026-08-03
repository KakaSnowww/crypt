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
    <main className="grid h-dvh min-h-0 overflow-hidden lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
      <section className="relative hidden h-full overflow-hidden border-r border-white/[0.06] bg-crypt-deep/40 p-12 lg:flex lg:flex-col xl:p-16">
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
          <h1 className="mt-5 text-5xl font-bold leading-[1.03] tracking-[-0.055em] text-white xl:text-6xl">
            Seu espaço para conversar e pertencer.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-crypt-muted">
            Servidores, amizades, mensagens e chamadas em uma experiência rápida, privada e feita
            para você.
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

          <div className="mt-10 grid max-w-lg grid-cols-[1fr_0.82fr] gap-3" aria-hidden="true">
            <div className="rounded-3xl border border-violet-400/15 bg-violet-500/[0.08] p-4 shadow-2xl shadow-violet-950/20">
              <div className="flex items-center gap-3">
                <span className="size-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500" />
                <span className="h-2.5 w-24 rounded-full bg-white/20" />
              </div>
              <div className="mt-5 space-y-3">
                <span className="block h-2 w-4/5 rounded-full bg-white/10" />
                <span className="block h-2 w-2/3 rounded-full bg-white/10" />
              </div>
            </div>
            <div className="translate-y-6 rounded-3xl border border-blue-400/15 bg-blue-500/[0.07] p-4">
              <div className="flex -space-x-2">
                <span className="size-8 rounded-full border-2 border-crypt-deep bg-violet-400" />
                <span className="size-8 rounded-full border-2 border-crypt-deep bg-blue-400" />
                <span className="size-8 rounded-full border-2 border-crypt-deep bg-fuchsia-400" />
              </div>
              <span className="mt-5 block h-2 w-3/4 rounded-full bg-white/10" />
            </div>
          </div>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-crypt-subtle">
          <CheckCircle2 aria-hidden="true" size={15} />
          Crypt 0.7 — simples de entender, poderoso para usar
        </p>
      </section>

      <section
        aria-label="Área de acesso"
        className="relative h-full min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8"
      >
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[-14rem] size-[26rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[100px] lg:hidden"
        />
        <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col justify-center py-6 sm:py-10">
          <div className="auth-surface p-5 sm:p-8 lg:p-9">
            <Brand className="mb-10 lg:hidden" />
            <Outlet />
          </div>
        </div>
      </section>
    </main>
  );
}
