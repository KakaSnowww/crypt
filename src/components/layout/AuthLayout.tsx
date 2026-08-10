import { BookOpenText, CheckCircle2, KeyRound, LibraryBig, Sparkles } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { AlchemicalLivingScene } from '../arcane/AlchemicalLivingScene';
import { Brand } from './Brand';

const benefits = [
  {
    icon: LibraryBig,
    text: 'Acervos vivos para comunidades, amizades e conversas.',
  },
  {
    icon: KeyRound,
    text: 'Salas reservadas, cargos e permissões sob sua guarda.',
  },
  {
    icon: Sparkles,
    text: 'Uma experiência própria para navegador, Windows e Android.',
  },
] as const;

export function AuthLayout() {
  return (
    <main className="crypt-auth-layout grid h-dvh min-h-0 overflow-hidden lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
      <section className="crypt-auth-story relative hidden h-full overflow-hidden border-r border-white/[0.06] p-12 lg:flex lg:flex-col xl:p-16">
        <AlchemicalLivingScene />
        <span aria-hidden="true" className="crypt-auth-story__circle" />
        <span aria-hidden="true" className="crypt-auth-story__constellations" />
        <span aria-hidden="true" className="crypt-auth-story__crystal">
          <BookOpenText size={29} />
        </span>

        <Brand className="relative z-10" />

        <div className="relative z-10 my-auto max-w-xl py-16">
          <p className="eyebrow flex items-center gap-2">
            <LibraryBig size={14} />O arquivo impossível aguarda
          </p>
          <h1 className="crypt-auth-title mt-5 text-5xl font-black leading-[1.01] tracking-[-0.06em] xl:text-6xl">
            Abra as portas da
            <span> Biblioteca Oculta.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-crypt-muted">
            Entre em um arquivo vivo de comunidades, correspondências e rituais digitais — criado
            para parecer um lugar impossível, não mais uma plataforma comum.
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

          <div aria-hidden="true" className="crypt-auth-tome mt-10">
            <BookOpenText size={30} strokeWidth={1.25} />
            <span>Catálogo reservado · MMXXVI</span>
          </div>
        </div>

        <p className="relative z-10 flex items-center gap-2 text-xs text-crypt-subtle">
          <CheckCircle2 aria-hidden="true" size={15} />
          Crypt 0.10.0 — a ascensão arcana
        </p>
      </section>

      <section
        aria-label="Área de acesso"
        className="crypt-auth-access relative h-full min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8"
      >
        <div aria-hidden="true" className="crypt-auth-access__mobile-sigil" />
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
