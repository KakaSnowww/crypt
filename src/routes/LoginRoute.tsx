import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toAuthActionError } from '../features/auth/auth.errors';
import { loginSchema, type LoginValues } from '../features/auth/auth.schemas';
import { getSafeNextPath, loginWithPassword } from '../features/auth/auth.service';
import { AuthConfigurationNotice } from '../features/auth/components/AuthConfigurationNotice';
import {
  useAuthExperience,
  waitForAuthTransition,
} from '../features/auth/components/useAuthExperience';
import { AuthField } from '../features/auth/components/AuthField';
import { AuthFormError } from '../features/auth/components/AuthFormError';
import { AuthScreen } from '../features/auth/components/AuthScreen';
import { AuthSubmitButton } from '../features/auth/components/AuthSubmitButton';

export function LoginRoute() {
  const navigate = useNavigate();
  const { setPhase } = useAuthExperience();
  const [searchParams] = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get('next'));
  const form = useForm<LoginValues>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: zodResolver(loginSchema),
  });
  const loginMutation = useMutation({
    mutationFn: loginWithPassword,
    onSuccess: async () => {
      setPhase('verified');
      await waitForAuthTransition();
      void navigate(nextPath, { replace: true });
    },
  });

  useEffect(() => {
    if (loginMutation.isPending) setPhase('loading');
    else if (loginMutation.error) setPhase('error');
  }, [loginMutation.error, loginMutation.isPending, setPhase]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values).catch(() => undefined);
  });

  return (
    <AuthScreen
      description="Entre para continuar no Crypt. Sua sessão será protegida e sincronizada com seus espaços."
      eyebrow="Identity handshake"
      id="login-title"
      step="01"
      title="Bem-vindo de volta"
    >
      <AuthConfigurationNotice />

      <form className="auth-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <AuthField
          autoComplete="email"
          errorText={form.formState.errors.email?.message}
          label="E-mail"
          icon={<Mail aria-hidden="true" size={17} />}
          placeholder="voce@exemplo.com"
          required
          type="email"
          {...form.register('email')}
        />
        <AuthField
          autoComplete="current-password"
          errorText={form.formState.errors.password?.message}
          label="Senha"
          icon={<KeyRound aria-hidden="true" size={17} />}
          placeholder="Digite sua senha"
          required
          type="password"
          {...form.register('password')}
        />

        <div className="auth-form__options">
          <span>
            <ShieldCheck size={13} /> Conexão protegida
          </span>
          <Link className="auth-link" to="/recuperar-senha">
            Esqueci minha senha
          </Link>
        </div>

        <AuthFormError
          message={loginMutation.error ? toAuthActionError(loginMutation.error).message : undefined}
        />

        <AuthSubmitButton
          loading={loginMutation.isPending}
          loadingLabel="ESTABELECENDO SESSÃO"
          type="submit"
        >
          Entrar no Crypt
        </AuthSubmitButton>
      </form>

      <div className="auth-form__switch">
        <span>NEW IDENTITY</span>
        <p>Ainda não faz parte da rede?</p>
        <Link className="auth-link" to="/cadastro">
          Criar uma conta
        </Link>
      </div>
    </AuthScreen>
  );
}
