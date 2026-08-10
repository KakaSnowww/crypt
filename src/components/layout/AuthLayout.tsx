import {
  CheckCircle2,
  Gem,
  LockKeyhole,
  MessageCircleHeart,
  Orbit,
  Sparkles,
  Users,
} from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { Brand } from './Brand';

const benefits = [
  {
    icon: Users,
    text: 'Comunidades, amizades e conversas reunidas em um só círculo.',
  },
  {
    icon: LockKeyhole,
    text: 'Privacidade, cargos e permissões protegidos desde a fundação.',
  },
  {
    icon: MessageCircleHeart,
    text: 'Chamadas de voz, vídeo e tela em uma experiência contínua.',
  },
  {
    icon: Sparkles,
    text: 'Uma atmosfera própria para navegador, Windows e Android.',
  },
] as const;

const experienceChips = [
  { label: 'Servidores', value: '∞' },
  { label: 'Canais', value: '∞' },
  { label: 'Idiomas', value: 'PT-BR' },
  { label: 'Latência', value: '< 80ms' },
] as const;

function SanctuaryHero() {
  return (
    <div aria-hidden="true" className="crypt-auth-sanctuary">
      <div className="crypt-auth-sanctuary__veil" />

      <svg
        className="crypt-auth-sanctuary__arches"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="archGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(132 86 255 / 32%)" />
            <stop offset="100%" stopColor="rgb(132 86 255 / 0)" />
          </linearGradient>
          <linearGradient id="archStroke" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(180 200 255 / 45%)" />
            <stop offset="100%" stopColor="rgb(180 200 255 / 0)" />
          </linearGradient>
          <radialGradient id="floorGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(95 60 220 / 55%)" />
            <stop offset="60%" stopColor="rgb(95 60 220 / 12%)" />
            <stop offset="100%" stopColor="rgb(95 60 220 / 0)" />
          </radialGradient>
        </defs>

        {/* distant arches */}
        <g fill="url(#archGradient)" stroke="url(#archStroke)" strokeWidth="1">
          <path d="M -40 800 L -40 380 Q 180 140 400 380 L 400 800 Z" />
          <path d="M 380 800 L 380 320 Q 700 0 1020 320 L 1020 800 Z" />
          <path d="M 980 800 L 980 380 Q 1180 140 1380 380 L 1380 800 Z" />
        </g>

        {/* floor perspective lines */}
        <g stroke="rgb(170 180 255 / 18%)" fill="none" strokeWidth="1">
          <path d="M -120 720 L 600 480" />
          <path d="M 1320 720 L 600 480" />
          <path d="M 0 660 L 1200 660" strokeDasharray="2 8" />
          <path d="M 120 580 L 1080 580" strokeDasharray="2 10" />
          <path d="M 260 500 L 940 500" strokeDasharray="2 12" />
          <path d="M 400 420 L 800 420" strokeDasharray="2 14" />
        </g>

        {/* floor glow */}
        <ellipse cx="600" cy="640" rx="420" ry="48" fill="url(#floorGlow)" />
      </svg>

      {/* magic circle */}
      <div className="crypt-auth-sanctuary__sigil" />

      {/* floating particles (CSS-only, deterministic) */}
      <div className="crypt-auth-sanctuary__particles">
        {Array.from({ length: 18 }).map((_, index) => (
          <i
            key={index}
            style={
              {
                '--auth-particle-left': `${(index * 53 + 11) % 100}%`,
                '--auth-particle-top': `${(index * 37 + 7) % 100}%`,
                '--auth-particle-size': `${1 + ((index * 5) % 3)}px`,
                '--auth-particle-duration': `${10 + ((index * 4) % 14)}s`,
                '--auth-particle-delay': `${-((index * 3) % 12)}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* crystal accents */}
      <span className="crypt-auth-sanctuary__crystal crypt-auth-sanctuary__crystal--a">
        <Gem size={26} />
      </span>
      <span className="crypt-auth-sanctuary__crystal crypt-auth-sanctuary__crystal--b">
        <Gem size={18} />
      </span>
    </div>
  );
}

export function AuthLayout() {
  const location = useLocation();
  const onLogin = location.pathname === '/login';
  const onRegister = location.pathname === '/cadastro';

  const heroEyebrow = onRegister
    ? 'Forje sua conta arcana'
    : onLogin
      ? 'Santuário Arcano · Acesso'
      : 'Crypt · Autenticação';
  const heroTitleMain = onRegister ? 'Crie seu lugar' : 'Conversas que';
  const heroTitleAccent = onRegister ? 'no círculo.' : 'criam constelações.';

  return (
    <main className="crypt-auth-layout grid h-dvh min-h-0 overflow-hidden lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      <section
        aria-label="Apresentação do Crypt"
        className="crypt-auth-story relative hidden h-full overflow-hidden p-10 lg:flex lg:flex-col xl:p-14"
      >
        <SanctuaryHero />

        <Brand className="relative z-10" />

        <div className="relative z-10 my-auto max-w-xl py-12">
          <p className="eyebrow crypt-auth-eyebrow flex items-center gap-2">
            <Orbit aria-hidden="true" size={14} />
            {heroEyebrow}
          </p>
          <h1 className="crypt-auth-title mt-5 text-5xl font-black leading-[1.02] tracking-[-0.05em] xl:text-[3.6rem]">
            {heroTitleMain}
            <span> {heroTitleAccent}</span>
          </h1>
          <p className="crypt-auth-lede mt-6 max-w-lg text-[0.95rem] leading-7">
            O Crypt reúne servidores, mensagens, chamadas e comunidades em uma atmosfera arcana,
            tecnológica e feita para pertencer. Entre para continuar de onde parou.
          </p>

          <ul className="mt-9 grid gap-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <li
                  className="crypt-auth-benefit flex items-start gap-3 text-sm leading-6"
                  key={benefit.text}
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl">
                    <Icon aria-hidden="true" size={15} />
                  </span>
                  <span>{benefit.text}</span>
                </li>
              );
            })}
          </ul>

          <div
            aria-hidden="true"
            className="crypt-auth-orbit-preview mt-9 flex flex-wrap items-center gap-2"
          >
            {experienceChips.map((chip) => (
              <span className="crypt-auth-chip" key={chip.label}>
                <span className="crypt-auth-chip__value">{chip.value}</span>
                <span className="crypt-auth-chip__label">{chip.label}</span>
              </span>
            ))}
          </div>
        </div>

        <p className="crypt-auth-version relative z-10 flex items-center gap-2 text-xs">
          <CheckCircle2 aria-hidden="true" size={14} />
          Crypt 0.10.0 — a ascensão arcana
        </p>
      </section>

      <section
        aria-label="Área de acesso"
        className="crypt-auth-access relative h-full min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8"
      >
        <div aria-hidden="true" className="crypt-auth-access__sigil" />
        <div aria-hidden="true" className="crypt-auth-access__glow" />

        <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col justify-center py-8 sm:py-10">
          <div className="crypt-auth-mobile-brand lg:hidden">
            <Brand className="mx-auto" />
          </div>

          <div className="auth-surface crypt-auth-panel p-5 sm:p-8 lg:p-9">
            <div aria-hidden="true" className="crypt-auth-panel__frame" />
            <Outlet />
          </div>
        </div>
      </section>
    </main>
  );
}
