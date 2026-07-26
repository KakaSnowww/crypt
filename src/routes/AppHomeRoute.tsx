import {
  BellRing,
  FileUp,
  MessageCircleMore,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const deliveredFeatures = [
  {
    description: 'Categorias, nomes livres, ícones separados, tópicos e ordenação.',
    icon: Server,
    title: 'Canais organizados',
  },
  {
    description: 'Cargos hierárquicos, permissões e exceções por categoria ou canal.',
    icon: ShieldCheck,
    title: 'Acesso sob controle',
  },
  {
    description: 'Histórico paginado, respostas, edição, exclusão, reações e fixados.',
    icon: MessageCircleMore,
    title: 'Mensagens reais',
  },
  {
    description: 'Arquivos privados de até 5 MB com links temporários e limpeza segura.',
    icon: FileUp,
    title: 'Anexos privados',
  },
  {
    description: 'Atualizações sem F5, indicador de digitação e presença dos membros.',
    icon: Users,
    title: 'Tempo real',
  },
  {
    description: 'Contadores por canal e destaque separado para menções diretas.',
    icon: BellRing,
    title: 'Não lidas e menções',
  },
] as const;

export function AppHomeRoute() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-blue-500/5 to-transparent p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-950/40">
          <Sparkles aria-hidden="true" size={22} />
        </span>
        <p className="eyebrow mt-7">Fases 7 e 8 — entrega unificada</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Seus servidores agora têm conversas de verdade
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
          Organize o espaço, defina quem pode acessar cada canal e converse com histórico seguro em
          tempo real.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-blue-500"
          to="/app/servidores"
        >
          <Server aria-hidden="true" size={17} />
          Abrir meus servidores
        </Link>
      </section>

      <section aria-labelledby="delivered-title" className="mt-8">
        <h2 className="text-lg font-semibold text-white" id="delivered-title">
          O que já está conectado
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {deliveredFeatures.map(({ description, icon: Icon, title }) => (
            <article className="panel p-5" key={title}>
              <span className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
                <Icon aria-hidden="true" size={18} />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-crypt-subtle">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
