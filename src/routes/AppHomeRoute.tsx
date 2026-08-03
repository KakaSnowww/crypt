import { ArrowRight, MessageCircle, Server, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  {
    description: 'Entre em uma comunidade, abra um canal ou continue uma chamada.',
    icon: Server,
    label: 'Abrir servidores',
    to: '/app/servidores',
  },
  {
    description: 'Continue conversas individuais ou crie um grupo com seus amigos.',
    icon: MessageCircle,
    label: 'Ver mensagens',
    to: '/app/mensagens',
  },
  {
    description: 'Encontre pessoas, responda pedidos e veja novas sugestões.',
    icon: Users,
    label: 'Gerenciar conexões',
    to: '/app/conexoes',
  },
] as const;

export function AppHomeRoute() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-7 sm:py-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-violet-400/15 bg-[#0e1527] p-6 shadow-2xl shadow-black/20 sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-violet-500/20 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-blue-500/15 blur-[110px]" />
        <div className="relative max-w-3xl">
          <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg shadow-violet-950/30">
            <Sparkles aria-hidden="true" size={21} />
          </span>
          <p className="eyebrow mt-7">Seu espaço no Crypt</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-white sm:text-5xl">
            Tudo o que importa, sem menus desnecessários.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-crypt-muted sm:text-base">
            Acesse servidores, mensagens e amizades diretamente. As ferramentas administrativas
            aparecem somente quando você realmente precisa delas.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-[#0b1020] transition hover:-translate-y-0.5 hover:bg-violet-50"
              to="/app/servidores"
            >
              Continuar no Crypt <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
              to="/app/perfil/editar"
            >
              Personalizar perfil
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="quick-actions-title" className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Atalhos</p>
            <h2
              className="mt-2 text-xl font-bold tracking-tight text-white"
              id="quick-actions-title"
            >
              Para onde você quer ir?
            </h2>
          </div>
          <span className="hidden items-center gap-2 text-xs text-crypt-subtle sm:flex">
            <ShieldCheck size={15} /> Protegido pelas suas permissões
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {quickActions.map(({ description, icon: Icon, label, to }) => (
            <Link
              className="panel group p-5 transition duration-200 hover:-translate-y-1 hover:border-violet-400/25"
              key={label}
              to={to}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-2xl border border-violet-400/10 bg-violet-500/10 text-violet-200">
                  <Icon aria-hidden="true" size={19} />
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="text-crypt-subtle transition group-hover:translate-x-1 group-hover:text-violet-200"
                  size={17}
                />
              </div>
              <h3 className="mt-5 font-bold text-white">{label}</h3>
              <p className="mt-2 text-xs leading-5 text-crypt-muted">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
