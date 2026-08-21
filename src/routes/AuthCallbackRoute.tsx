import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toAuthActionError } from '../features/auth/auth.errors';
import { completeAuthCallback, getSafeNextPath } from '../features/auth/auth.service';
import {
  useAuthExperience,
  waitForAuthTransition,
} from '../features/auth/components/useAuthExperience';
import { AuthState } from '../features/auth/components/AuthScreen';

export function AuthCallbackRoute() {
  const navigate = useNavigate();
  const { setPhase } = useAuthExperience();
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
      setPhase('error');
      return;
    }

    let active = true;
    setPhase('loading');

    void completeAuthCallback(code)
      .then(async () => {
        if (active) {
          setPhase('verified');
          await waitForAuthTransition(420);
          if (!active) return;
          const nextPath =
            requestedNext === '/redefinir-senha'
              ? '/redefinir-senha'
              : getSafeNextPath(requestedNext);
          void navigate(nextPath, { replace: true });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPhase('error');
          setErrorMessage(toAuthActionError(error).message);
        }
      });

    return () => {
      active = false;
    };
  }, [code, immediateError, navigate, requestedNext, setPhase]);

  const visibleError = immediateError ?? errorMessage;

  if (visibleError) {
    return (
      <AuthState
        action={
          <Link className="auth-state__button" to="/login">
            Voltar para o login
          </Link>
        }
        description={visibleError}
        icon="error"
        id="callback-error-title"
        title="Não foi possível concluir"
      />
    );
  }

  return (
    <AuthState
      description="Estamos verificando a assinatura recebida e preparando sua sessão."
      id="callback-loading-title"
      title="Validando seu acesso…"
    />
  );
}
