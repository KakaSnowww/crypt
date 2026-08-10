import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';
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

  const passwordFieldId = useId();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section aria-labelledby="login-title" className="crypt-login-route">
      <header className="crypt-login-header">
        <p className="crypt-login-eyebrow">
          <Sparkles aria-hidden="true" size={13} />
          Santuário Arcano · Acesso
        </p>
        <h1 className="crypt-login-title" id="login-title">
          Que bom ter você de volta
        </h1>
        <p className="crypt-login-subtitle">
          Entre novamente no seu círculo. Retome conversas, chamadas e comunidades onde estavam.
        </p>
      </header>

      <AuthConfigurationNotice />

      <form className="crypt-login-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Input
          autoComplete="email"
          className="crypt-login-field"
          errorText={form.formState.errors.email?.message}
          label="E-mail"
          leadingIcon={<Mail aria-hidden="true" size={18} />}
          placeholder="voce@exemplo.com"
          required
          type="email"
          {...form.register('email')}
        />

        <div className="crypt-login-field">
          <Input
            aria-controls={`${passwordFieldId}-toggle`}
            autoComplete="current-password"
            className="crypt-login-field__inner"
            errorText={form.formState.errors.password?.message}
            id={passwordFieldId}
            label="Senha"
            leadingIcon={<KeyRound aria-hidden="true" size={18} />}
            placeholder="Digite sua senha"
            required
            type={showPassword ? 'text' : 'password'}
            {...form.register('password')}
          />
          <button
            aria-controls={passwordFieldId}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={showPassword}
            className="crypt-login-toggle"
            id={`${passwordFieldId}-toggle`}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" size={18} />
            ) : (
              <Eye aria-hidden="true" size={18} />
            )}
          </button>
        </div>

        <div className="crypt-login-links">
          <Link className="crypt-login-link" to="/recuperar-senha">
            Esqueci minha senha
          </Link>
        </div>

        <AuthFormError
          message={loginMutation.error ? toAuthActionError(loginMutation.error).message : undefined}
        />

        <div className="crypt-login-submit-wrap">
          <Button
            className="crypt-login-submit"
            leadingIcon={<ShieldCheck aria-hidden="true" size={18} />}
            loading={loginMutation.isPending}
            size="lg"
            type="submit"
          >
            Entrar no Crypt
          </Button>
          <span aria-hidden="true" className="crypt-login-submit__sigil" />
        </div>
      </form>

      <div aria-hidden="true" className="crypt-login-divider">
        <span />
        <i />
        <span />
      </div>

      <p className="crypt-login-register">
        Ainda não tem uma conta?{' '}
        <Link className="crypt-login-link crypt-login-link--strong" to="/cadastro">
          Criar conta
        </Link>
      </p>
    </section>
  );
}
