import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { toAuthActionError } from '../features/auth/auth.errors';
import { passwordUpdateSchema, type PasswordUpdateValues } from '../features/auth/auth.schemas';
import { updatePassword } from '../features/auth/auth.service';
import { AuthFormError } from '../features/auth/components/AuthFormError';
import { AuthPageHeader } from '../features/auth/components/AuthPageHeader';
import { useAuth } from '../features/auth/useAuth';

export function ResetPasswordRoute() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const form = useForm<PasswordUpdateValues>({
    defaultValues: {
      confirmPassword: '',
      password: '',
    },
    resolver: zodResolver(passwordUpdateSchema),
  });
  const updateMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => void navigate('/app', { replace: true }),
  });
  const handleSubmit = form.handleSubmit(async (values) => {
    await updateMutation.mutateAsync(values).catch(() => undefined);
  });

  if (status === 'loading') {
    return <p className="text-sm text-crypt-muted">Verificando o link seguro…</p>;
  }

  if (status !== 'authenticated') {
    return (
      <section aria-labelledby="reset-invalid-title">
        <h1 className="text-3xl font-bold tracking-tight text-white" id="reset-invalid-title">
          Link inválido ou expirado
        </h1>
        <p className="mt-3 text-sm leading-6 text-crypt-muted">
          Solicite outro e-mail de recuperação para criar uma nova senha.
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-2xl bg-violet-600 px-4 text-sm font-semibold text-white"
          to="/recuperar-senha"
        >
          Solicitar novo link
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="reset-title">
      <AuthPageHeader
        description="Escolha uma senha diferente das anteriores e que você não utilize em outros serviços."
        eyebrow="Link validado"
        id="reset-title"
        title="Crie sua nova senha"
      />

      <form className="mt-8 grid gap-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Input
          autoComplete="new-password"
          errorText={form.formState.errors.password?.message}
          helperText="Mínimo de 12 caracteres, com maiúscula, minúscula e número."
          label="Nova senha"
          leadingIcon={<KeyRound aria-hidden="true" size={17} />}
          required
          type="password"
          {...form.register('password')}
        />
        <Input
          autoComplete="new-password"
          errorText={form.formState.errors.confirmPassword?.message}
          label="Confirme a nova senha"
          leadingIcon={<KeyRound aria-hidden="true" size={17} />}
          required
          type="password"
          {...form.register('confirmPassword')}
        />
        <AuthFormError
          message={
            updateMutation.error ? toAuthActionError(updateMutation.error).message : undefined
          }
        />
        <Button className="w-full" loading={updateMutation.isPending} size="lg" type="submit">
          Salvar nova senha
        </Button>
      </form>
    </section>
  );
}
