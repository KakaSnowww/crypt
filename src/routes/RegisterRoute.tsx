import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AtSign, CheckCircle2, KeyRound, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { toAuthActionError } from '../features/auth/auth.errors';
import { registerSchema, type RegisterValues } from '../features/auth/auth.schemas';
import { registerAccount } from '../features/auth/auth.service';
import { AuthConfigurationNotice } from '../features/auth/components/AuthConfigurationNotice';
import { AuthFormError } from '../features/auth/components/AuthFormError';
import { AuthPageHeader } from '../features/auth/components/AuthPageHeader';

export function RegisterRoute() {
  const navigate = useNavigate();
  const [confirmationEmail, setConfirmationEmail] = useState<string>();
  const form = useForm<RegisterValues>({
    defaultValues: {
      confirmPassword: '',
      displayName: '',
      email: '',
      handle: '',
      password: '',
    },
    resolver: zodResolver(registerSchema),
  });
  const registerMutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: (result, values) => {
      if (result.requiresEmailConfirmation) {
        setConfirmationEmail(values.email);
        return;
      }

      void navigate('/app', { replace: true });
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await registerMutation.mutateAsync(values).catch(() => undefined);
  });

  if (confirmationEmail) {
    return (
      <section aria-labelledby="register-success-title">
        <span className="grid size-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 aria-hidden="true" size={24} />
        </span>
        <h1
          className="mt-5 text-3xl font-bold tracking-tight text-white"
          id="register-success-title"
        >
          Confirme seu e-mail
        </h1>
        <p className="mt-3 text-sm leading-6 text-crypt-muted">
          Enviamos uma confirmação para <strong className="text-white">{confirmationEmail}</strong>.
          Abra a mensagem no mesmo navegador para concluir seu acesso.
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
          to="/login"
        >
          Voltar para o login
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="register-title">
      <AuthPageHeader
        description="Crie sua identidade. O nome pode se repetir, mas o identificador @ será somente seu."
        eyebrow="Sua conta no Crypt"
        id="register-title"
        title="Comece por quem você é"
      />
      <AuthConfigurationNotice />

      <form className="mt-8 grid gap-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Input
          autoComplete="name"
          errorText={form.formState.errors.displayName?.message}
          label="Nome de exibição"
          leadingIcon={<UserRound aria-hidden="true" size={17} />}
          placeholder="Kaio Snow"
          required
          {...form.register('displayName')}
        />
        <Input
          autoCapitalize="none"
          autoComplete="username"
          errorText={form.formState.errors.handle?.message}
          helperText="De 3 a 24 caracteres: letras, números ou _."
          label="Identificador único"
          leadingIcon={<AtSign aria-hidden="true" size={17} />}
          placeholder="@kaiosnow"
          required
          spellCheck={false}
          {...form.register('handle')}
        />
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
          autoComplete="new-password"
          errorText={form.formState.errors.password?.message}
          helperText="Mínimo de 12 caracteres, com maiúscula, minúscula e número."
          label="Senha"
          leadingIcon={<KeyRound aria-hidden="true" size={17} />}
          required
          type="password"
          {...form.register('password')}
        />
        <Input
          autoComplete="new-password"
          errorText={form.formState.errors.confirmPassword?.message}
          label="Confirme a senha"
          leadingIcon={<KeyRound aria-hidden="true" size={17} />}
          required
          type="password"
          {...form.register('confirmPassword')}
        />

        <AuthFormError
          message={
            registerMutation.error ? toAuthActionError(registerMutation.error).message : undefined
          }
        />

        <Button
          className="mt-1 w-full"
          loading={registerMutation.isPending}
          size="lg"
          type="submit"
        >
          Criar minha conta
        </Button>
      </form>

      <p className="mt-7 text-center text-xs text-crypt-subtle">
        Já possui uma conta?{' '}
        <Link className="font-medium text-violet-300 hover:text-violet-200" to="/login">
          Entrar
        </Link>
      </p>
    </section>
  );
}
