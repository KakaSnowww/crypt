import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Fingerprint, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { toAuthActionError } from '../features/auth/auth.errors';
import { loginSchema, type LoginValues } from '../features/auth/auth.schemas';
import { getSafeNextPath, loginWithPassword } from '../features/auth/auth.service';
import { AuthConfigurationNotice } from '../features/auth/components/AuthConfigurationNotice';
import { AuthFormError } from '../features/auth/components/AuthFormError';

export function LoginRoute() {
  const navigate = useNavigate();
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
    onSuccess: () => void navigate(nextPath, { replace: true }),
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values).catch(() => undefined);
  });

  return (
    <section aria-labelledby="login-title" className="access-v4">
      <header className="access-v4__header">
        <div className="access-v4__sequence">
          <span>01</span>
          <i />
          <span>02</span>
          <i />
          <span>03</span>
        </div>
        <p className="eyebrow">
          <Fingerprint size={14} /> Identity handshake
        </p>
        <h1 id="login-title">Reconecte-se.</h1>
        <p>Sua comunidade, suas conversas e seus servidores estão esperando.</p>
      </header>
      <AuthConfigurationNotice />

      <form className="access-v4__form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Input
          autoComplete="email"
          errorText={form.formState.errors.email?.message}
          label="E-mail"
          leadingIcon={<Mail aria-hidden="true" size={17} />}
          placeholder="voce@exemplo.com"
          required
          type="email"
          {...form.register('email')}
        />
        <Input
          autoComplete="current-password"
          errorText={form.formState.errors.password?.message}
          label="Senha"
          leadingIcon={<KeyRound aria-hidden="true" size={17} />}
          placeholder="Digite sua senha"
          required
          type="password"
          {...form.register('password')}
        />

        <div className="access-v4__recovery">
          <span>
            <ShieldCheck size={13} /> Conexão protegida
          </span>
          <Link
            className="cyber-auth__link rounded-lg text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crypt-focus"
            to="/recuperar-senha"
          >
            Esqueci minha senha
          </Link>
        </div>

        <AuthFormError
          message={loginMutation.error ? toAuthActionError(loginMutation.error).message : undefined}
        />

        <Button
          className="access-v4__submit"
          loading={loginMutation.isPending}
          size="lg"
          type="submit"
        >
          Acessar o Crypt <ArrowRight size={17} />
        </Button>
      </form>

      <div className="access-v4__switch">
        <span>NEW OPERATOR</span>
        <p>Ainda não tem uma conta?</p>
        <Link
          className="cyber-auth__link font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crypt-focus"
          to="/cadastro"
        >
          Criar conta
        </Link>
      </div>
    </section>
  );
}
