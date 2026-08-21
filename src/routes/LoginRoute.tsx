import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { toAuthActionError } from '../features/auth/auth.errors';
import { loginSchema, type LoginValues } from '../features/auth/auth.schemas';
import { getSafeNextPath, loginWithPassword } from '../features/auth/auth.service';
import { AuthConfigurationNotice } from '../features/auth/components/AuthConfigurationNotice';
import { AuthFormError } from '../features/auth/components/AuthFormError';
import { AuthPageHeader } from '../features/auth/components/AuthPageHeader';

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
    <section aria-labelledby="login-title">
      <AuthPageHeader
        description="Continue de onde parou e encontre sua comunidade online."
        eyebrow="IDENTIDADE VERIFICADA"
        id="login-title"
        title="Bem-vindo de volta"
      />
      <AuthConfigurationNotice />

      <form className="mt-8 grid gap-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
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

        <div className="flex justify-end">
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

        <Button className="mt-1 w-full" loading={loginMutation.isPending} size="lg" type="submit">
          Acessar o Crypt
        </Button>
      </form>

      <p className="mt-7 text-center text-xs text-crypt-subtle">
        Ainda não tem uma conta?{' '}
        <Link
          className="cyber-auth__link font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crypt-focus"
          to="/cadastro"
        >
          Criar conta
        </Link>
      </p>
    </section>
  );
}
