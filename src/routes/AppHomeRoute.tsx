import {
  ArrowRight,
  Code2,
  Gamepad2,
  MessageCircle,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const shortcuts = [
  {
    description: 'Entre nas suas comunidades, descubra canais e acompanhe quem está online.',
    icon: Server,
    label: 'Servidores',
    meta: 'Comunidades e canais',
    to: '/app/servidores',
  },
  {
    description: 'Continue conversas privadas ou abra um grupo com quem realmente importa.',
    icon: MessageCircle,
    label: 'Mensagens',
    meta: 'Conversas diretas',
    to: '/app/mensagens',
  },
  {
    description: 'Encontre pessoas, gerencie solicitações e amplie sua rede no Crypt.',
    icon: Users,
    label: 'Conexões',
    meta: 'Sua rede',
    to: '/app/conexoes',
  },
] as const;

export function AppHomeRoute() {
  return (
    <main className="cyber-home mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
      <section className="cyber-home__hero grid gap-8 px-6 py-8 sm:px-9 sm:py-10 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)] xl:items-center">
        <div className="relative z-10 max-w-3xl">
          <span className="cyber-pill">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
            SYSTEM ONLINE
          </span>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
            Crypt Community OS
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl">
            Seu squad. Seu código. Seu espaço.
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-crypt-muted sm:text-base">
            Uma central social feita para jogar, construir projetos e manter suas comunidades por
            perto — rápida, organizada e com identidade própria.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="alchemy-button alchemy-button--primary" to="/app/servidores">
              Abrir servidores <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link className="alchemy-button" to="/app/busca">
              <Search aria-hidden="true" size={16} /> Busca global
            </Link>
          </div>
        </div>

        <div className="cyber-home__terminal relative z-10 p-4 sm:p-5" aria-hidden="true">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
            <div className="cyber-home__terminal-dots">
              <span />
              <span />
              <span />
            </div>
            <span className="text-[0.62rem] tracking-[0.16em] text-crypt-subtle">CRYPT.EXE</span>
          </div>
          <div className="space-y-3 py-5 text-xs leading-5">
            <p className="text-crypt-subtle">
              <span className="text-cyan-300">snow@crypt</span>:~$ connect --workspace
            </p>
            <p className="text-violet-300">✓ identidade sincronizada</p>
            <p className="text-violet-300">✓ comunidades disponíveis</p>
            <p className="text-emerald-300">✓ conexão protegida</p>
            <p className="flex items-center gap-2 pt-2 text-white">
              <span className="inline-block h-4 w-1.5 animate-pulse bg-cyan-300" /> pronto para
              iniciar
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-4">
            <Status icon={Gamepad2} label="PLAY" />
            <Status icon={Code2} label="BUILD" />
            <Status icon={Terminal} label="CHAT" />
          </div>
        </div>
      </section>

      <section aria-labelledby="shortcuts-title" className="mt-9">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Acesso rápido</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white" id="shortcuts-title">
              Continue de onde parou
            </h2>
          </div>
          <span className="hidden items-center gap-2 text-xs text-crypt-subtle sm:flex">
            <ShieldCheck size={14} className="text-emerald-300" /> Sessão segura e sincronizada
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {shortcuts.map(({ description, icon: Icon, label, meta, to }, index) => (
            <Link className="cyber-action-card group p-5" key={label} to={to}>
              <div className="flex items-center justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-200">
                  <Icon aria-hidden="true" size={19} />
                </span>
                <span className="font-mono text-[0.65rem] text-crypt-subtle">0{index + 1}</span>
              </div>
              <p className="mt-7 text-[0.64rem] font-bold uppercase tracking-[0.17em] text-cyan-300">
                {meta}
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-white">{label}</h3>
              <p className="mt-3 text-xs leading-6 text-crypt-muted">{description}</p>
              <span className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-violet-200">
                Acessar <ArrowRight className="transition group-hover:translate-x-1" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel mt-7 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-500/[0.08] text-cyan-300">
          <Zap aria-hidden="true" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Crypt Pro</p>
          <h2 className="mt-1 font-semibold text-white">
            Mais qualidade de transmissão, personalização e espaço para sua comunidade.
          </h2>
        </div>
        <Link className="alchemy-button shrink-0" to="/app/arcana">
          Conhecer o Pro <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </section>
    </main>
  );
}

function Status({ icon: Icon, label }: { icon: typeof Gamepad2; label: string }) {
  return (
    <span className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.035] px-2 py-2 text-[0.62rem] font-bold tracking-wider text-crypt-muted">
      <Icon size={12} /> {label}
    </span>
  );
}
