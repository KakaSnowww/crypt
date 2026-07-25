import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { toAuthActionError } from '../features/auth/auth.errors';
import { passwordRecoverySchema, type PasswordRecoveryValues } from '../features/auth/auth.schemas';
import { requestPasswordRecovery } from '../features/auth/auth.service';
import { AuthConfigurationNotice } from '../features/auth/components/AuthConfigurationNotice';
import { AuthFormError } from '../features/auth/components/AuthFormError';
import { AuthPageHeader } from '../features/auth/components/AuthPageHeader';

export function ForgotPasswordRoute() {
  const [requestCompleted, setRequestCompleted] = useState(false);
  const form = useForm<PasswordRecoveryValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(passwordRecoverySchema),
  });
  const recoveryMutation = useMutation({
    mutationFn: requestPasswordRecovery,
    onSuccess: () => setRequestCompleted(true),
  });
  const handleSubmit = form.handleSubmit(async (values) => {
    await recoveryMutation.mutateAsync(values).catch(() => undefined);
  });

  if (requestCompleted) {
    return (
      <section aria-labelledby="recovery-success-title">
        <span className="grid size-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 aria-hidden="true" size={24} />
        </span>
        <h1
          className="mt-5 text-3xl font-bold tracking-tight text-white"
          id="recovery-success-title"
        >
          Verifique sua caixa de entrada
        </h1>
        <p className="mt-3 text-sm leading-6 text-crypt-muted">
          Se houver uma conta com esse e-mail, enviaremos um link para criar uma nova senha.
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.11]"
          to="/login"
        >
          Voltar para o login
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="recovery-title">
      <AuthPageHeader
        description="Informe o e-mail da conta. Por privacidade, a resposta será igual mesmo se ele não estiver cadastrado."
        eyebrow="Recuperação de acesso"
        id="recovery-title"
        title="Vamos recuperar sua conta"
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
        <AuthFormError
          message={
            recoveryMutation.error ? toAuthActionError(recoveryMutation.error).message : undefined
          }
        />
        <Button className="w-full" loading={recoveryMutation.isPending} size="lg" type="submit">
          Enviar link seguro
        </Button>
      </form>

      <p className="mt-7 text-center text-xs text-crypt-subtle">
        Lembrou sua senha?{' '}
        <Link className="font-medium text-violet-300 hover:text-violet-200" to="/login">
          Voltar ao login
        </Link>
      </p>
    </section>
  );
}
