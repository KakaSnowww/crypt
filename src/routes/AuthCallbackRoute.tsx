import { CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '../components/common/Spinner';
import { toAuthActionError } from '../features/auth/auth.errors';
import { completeAuthCallback, getSafeNextPath } from '../features/auth/auth.service';

export function AuthCallbackRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>();
  const code = searchParams.get('code');
  const providerError = searchParams.get('error_description');
  const requestedNext = searchParams.get('next');
  const immediateError =
    (providerError ? 'O provedor recusou ou expirou esta solicitação.' : undefined) ??
    (code ? undefined : 'O link não contém um código de autenticação válido.');

  useEffect(() => {
    if (immediateError || !code) {
      return;
    }

    let active = true;

    void completeAuthCallback(code)
      .then(() => {
        if (active) {
          const nextPath =
            requestedNext === '/redefinir-senha'
              ? '/redefinir-senha'
              : getSafeNextPath(requestedNext);
          void navigate(nextPath, { replace: true });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(toAuthActionError(error).message);
        }
      });

    return () => {
      active = false;
    };
  }, [code, immediateError, navigate, requestedNext]);

  const visibleError = immediateError ?? errorMessage;

  if (visibleError) {
    return (
      <section aria-labelledby="callback-error-title">
        <span className="grid size-12 place-items-center rounded-2xl bg-red-500/10 text-red-300">
          <CircleAlert aria-hidden="true" size={24} />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white" id="callback-error-title">
          Não foi possível concluir
        </h1>
        <p className="mt-3 text-sm leading-6 text-crypt-muted">{visibleError}</p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-2xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500"
          to="/login"
        >
          Voltar para o login
        </Link>
      </section>
    );
  }

  return (
    <section aria-live="polite" className="grid justify-items-center gap-4 py-12 text-center">
      <Spinner />
      <h1 className="text-xl font-semibold text-white">Validando seu acesso…</h1>
      <p className="text-sm text-crypt-muted">Esta etapa leva apenas alguns segundos.</p>
    </section>
  );
}
