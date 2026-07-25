const foundations = [
  {
    description: 'Componentes modernos com tipagem estrita desde o primeiro arquivo.',
    label: 'React + TypeScript',
  },
  {
    description: 'Desenvolvimento rápido e estilos gerados sem código em tempo de execução.',
    label: 'Vite + Tailwind',
  },
  {
    description: 'Tipos, lint, testes, formatação e build reunidos em uma validação.',
    label: 'Qualidade automatizada',
  },
] as const;

function CryptMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-11"
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mark-surface" x1="8" x2="56" y1="4" y2="60">
          <stop stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#0b1020" />
        </linearGradient>
        <linearGradient id="mark-signal" x1="14" x2="50" y1="14" y2="50">
          <stop stopColor="#a78bfa" />
          <stop offset="0.52" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect fill="url(#mark-surface)" height="64" rx="18" width="64" />
      <path
        d="M45 20.5A18 18 0 1 0 45 43.5"
        stroke="url(#mark-signal)"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        d="M45 20.5 36.5 28M45 43.5 36.5 36"
        stroke="url(#mark-signal)"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <circle cx="46" cy="20" fill="#c4b5fd" r="4" />
      <circle cx="46" cy="44" fill="#60a5fa" r="4" />
    </svg>
  );
}

export function App() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden px-5 py-6 text-crypt-text sm:px-8 lg:px-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[-22rem] -z-10 mx-auto h-[42rem] max-w-5xl rounded-full bg-crypt-purple/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 bottom-[-18rem] -z-10 size-[34rem] rounded-full bg-crypt-blue/15 blur-[110px]"
      />

      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <a
            aria-label="Crypt — página inicial"
            className="flex items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crypt-focus"
            href="/"
          >
            <CryptMark />
            <span className="text-xl font-bold tracking-[-0.03em]">Crypt</span>
          </a>

          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-crypt-muted">
            Fase 1 concluída
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center py-20 sm:py-24">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              Comunidade com identidade própria
            </p>
            <h1 className="text-balance text-5xl font-bold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Seu espaço para conversar, descobrir e pertencer.
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-crypt-muted sm:text-lg sm:leading-8">
              A fundação técnica do Crypt está pronta: rápida, tipada, testada e preparada para
              crescer com segurança até as versões web, Windows e Android.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {foundations.map((foundation, index) => (
              <article
                className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/10 backdrop-blur"
                key={foundation.label}
              >
                <span className="mb-6 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-blue-500/20 text-sm font-semibold text-violet-200">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2 className="font-semibold text-white">{foundation.label}</h2>
                <p className="mt-2 text-sm leading-6 text-crypt-muted">{foundation.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-sm text-crypt-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Base pronta para evoluir</span>
          <span>Próxima etapa: design system e navegação</span>
        </footer>
      </div>
    </main>
  );
}
