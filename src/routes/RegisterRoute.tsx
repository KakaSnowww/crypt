import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Mail,
  UserRound,
} from 'lucide-react';
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
    <section aria-labelledby="register-title" className="access-v4 access-v4--register">
      <header className="access-v4__header">
        <div className="access-v4__sequence">
          <span>01</span>
          <i />
          <span>02</span>
          <i />
          <span>03</span>
        </div>
        <p className="eyebrow">
          <Fingerprint size={14} /> Create identity
        </p>
        <h1 id="register-title">Entre para a rede.</h1>
        <p>Monte sua identidade única e encontre pessoas para jogar, criar e conversar.</p>
      </header>
      <AuthConfigurationNotice />

      <form
        className="access-v4__form access-v4__form--register"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
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
          className="access-v4__submit"
          loading={registerMutation.isPending}
          size="lg"
          type="submit"
        >
          Criar minha conta <ArrowRight size={17} />
        </Button>
      </form>

      <div className="access-v4__switch">
        <span>KNOWN OPERATOR</span>
        <p>Já possui uma conta?</p>
        <Link className="font-medium text-violet-300 hover:text-violet-200" to="/login">
          Entrar
        </Link>
      </div>
    </section>
  );
}
