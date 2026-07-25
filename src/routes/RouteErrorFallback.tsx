import { CircleAlert } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

export function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? 'Não foi possível abrir esta página.'
    : 'Ocorreu uma falha inesperada durante a navegação.';

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <section className="panel w-full max-w-lg p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-500/10 text-red-300">
          <CircleAlert aria-hidden="true" size={22} />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-white">Não conseguimos continuar</h1>
        <p className="mt-3 text-sm leading-6 text-crypt-muted">{message}</p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
          to="/app"
        >
          Voltar ao aplicativo
        </Link>
      </section>
    </main>
  );
}
