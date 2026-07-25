import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/layout/Brand';

export function NotFoundRoute() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12 text-center">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[120px]"
      />
      <section className="relative w-full max-w-lg">
        <Brand className="mx-auto w-fit" />
        <p className="mt-12 bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-8xl font-black tracking-[-0.08em] text-transparent sm:text-9xl">
          404
        </p>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">
          Este caminho ainda não existe
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-crypt-muted">
          O endereço pode ter mudado ou essa parte do Crypt ainda não foi construída.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
            to="/app"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Voltar ao início
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
            to="/login"
          >
            <Compass aria-hidden="true" size={16} />
            Ver tela de acesso
          </Link>
        </div>
      </section>
    </main>
  );
}
