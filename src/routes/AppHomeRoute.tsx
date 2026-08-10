import {
  ArrowRight,
  BookOpenText,
  FlaskConical,
  MessageCircle,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const collections = [
  {
    description: 'Percorra comunidades, salas e conversas reunidas nos seus acervos.',
    icon: Server,
    label: 'Abrir acervos',
    meta: 'Comunidades e salas',
    to: '/app/servidores',
  },
  {
    description: 'Retome cartas individuais ou reúna um pequeno círculo de pessoas.',
    icon: MessageCircle,
    label: 'Correspondências',
    meta: 'Mensagens diretas',
    to: '/app/mensagens',
  },
  {
    description: 'Encontre pessoas, responda solicitações e amplie sua rede de vínculos.',
    icon: Users,
    label: 'Vínculos',
    meta: 'Pessoas e conexões',
    to: '/app/conexoes',
  },
] as const;

export function AppHomeRoute() {
  return (
    <main className="alchemy-home mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
      <section className="alchemy-hero relative isolate overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
        <div className="alchemy-hero__seal" aria-hidden="true">
          <FlaskConical size={30} strokeWidth={1.35} />
        </div>
        <div className="relative max-w-3xl">
          <p className="alchemy-kicker">Biblioteca impossível · Crypt</p>
          <h1 className="alchemy-display mt-4 text-4xl leading-[0.98] sm:text-6xl">
            Um arquivo vivo além do mundo conhecido.
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-crypt-muted sm:text-base">
            Grimórios tornam-se conversas, acervos guardam comunidades e cada vínculo abre uma nova
            passagem. Explore sem ruído, no seu próprio ritmo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="alchemy-button alchemy-button--primary" to="/app/servidores">
              Consultar acervos <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link className="alchemy-button" to="/app/busca">
              <Search aria-hidden="true" size={16} /> Buscar no catálogo
            </Link>
          </div>
        </div>
        <div className="alchemy-hero__folio" aria-hidden="true">
          <span>I</span>
          <BookOpenText size={18} />
          <span>MMXXVI</span>
        </div>
      </section>

      <section aria-labelledby="collections-title" className="mt-10">
        <div className="alchemy-section-heading">
          <div>
            <p className="alchemy-kicker">Índice principal</p>
            <h2 className="alchemy-display mt-2 text-2xl" id="collections-title">
              Coleções em consulta
            </h2>
          </div>
          <span className="hidden items-center gap-2 text-xs text-crypt-subtle sm:flex">
            <ShieldCheck size={14} /> Acesso conforme suas permissões
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {collections.map(({ description, icon: Icon, label, meta, to }, index) => (
            <Link className="alchemy-card group" key={label} to={to}>
              <div className="flex items-center justify-between gap-4">
                <span className="alchemy-card__number">0{index + 1}</span>
                <Icon aria-hidden="true" className="text-[var(--alchemy-brass)]" size={19} />
              </div>
              <p className="mt-8 text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-crypt-subtle">
                {meta}
              </p>
              <h3 className="alchemy-display mt-2 text-xl text-white">{label}</h3>
              <p className="mt-3 text-xs leading-6 text-crypt-muted">{description}</p>
              <span className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-[var(--alchemy-parchment)]">
                Consultar <ArrowRight className="transition group-hover:translate-x-1" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="alchemy-note mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="alchemy-note__icon">
          <Sparkles aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="alchemy-kicker">Arcana</p>
          <h2 className="mt-1 font-semibold text-[var(--alchemy-parchment)]">
            A câmara de recursos especiais permanece ao seu alcance.
          </h2>
        </div>
        <Link className="alchemy-button shrink-0" to="/app/arcana">
          Abrir câmara <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </section>
    </main>
  );
}
