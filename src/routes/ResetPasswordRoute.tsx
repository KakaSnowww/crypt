import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toAuthActionError } from '../features/auth/auth.errors';
import { passwordUpdateSchema, type PasswordUpdateValues } from '../features/auth/auth.schemas';
import { updatePassword } from '../features/auth/auth.service';
import {
  useAuthExperience,
  waitForAuthTransition,
} from '../features/auth/components/useAuthExperience';
import { AuthField } from '../features/auth/components/AuthField';
import { AuthFormError } from '../features/auth/components/AuthFormError';
import { AuthScreen, AuthState } from '../features/auth/components/AuthScreen';
import { AuthSubmitButton } from '../features/auth/components/AuthSubmitButton';
import { useAuth } from '../features/auth/useAuth';

export function ResetPasswordRoute() {
  const navigate = useNavigate();
  const { setPhase } = useAuthExperience();
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
    onSuccess: async () => {
      setPhase('verified');
      await waitForAuthTransition();
      void navigate('/app', { replace: true });
    },
  });

  useEffect(() => {
    if (status === 'loading' || updateMutation.isPending) setPhase('loading');
    else if (updateMutation.error || status !== 'authenticated') setPhase('error');
    else if (!updateMutation.isSuccess) setPhase('idle');
  }, [setPhase, status, updateMutation.error, updateMutation.isPending, updateMutation.isSuccess]);
  const handleSubmit = form.handleSubmit(async (values) => {
    await updateMutation.mutateAsync(values).catch(() => undefined);
  });

  if (status === 'loading') {
    return (
      <AuthState
        description="Estamos confirmando a assinatura do canal de recuperação."
        id="reset-loading-title"
        title="Verificando link seguro…"
      />
    );
  }

  if (status !== 'authenticated') {
    return (
      <AuthState
        action={
          <Link className="auth-state__button" to="/recuperar-senha">
            Solicitar novo link
          </Link>
        }
        description="A assinatura deste link não é mais válida. Solicite um novo canal de recuperação."
        icon="error"
        id="reset-invalid-title"
        title="Link inválido ou expirado"
      />
    );
  }

  return (
    <AuthScreen
      description="Escolha uma senha diferente das anteriores e que você não utilize em outros serviços."
      eyebrow="Recovery signature valid"
      id="reset-title"
      step="04"
      title="Crie sua nova senha"
    >
      <form className="auth-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <AuthField
          autoComplete="new-password"
          errorText={form.formState.errors.password?.message}
          helperText="Mínimo de 12 caracteres, com maiúscula, minúscula e número."
          label="Nova senha"
          icon={<KeyRound aria-hidden="true" size={17} />}
          required
          type="password"
          {...form.register('password')}
        />
        <AuthField
          autoComplete="new-password"
          errorText={form.formState.errors.confirmPassword?.message}
          label="Confirme a nova senha"
          icon={<KeyRound aria-hidden="true" size={17} />}
          required
          type="password"
          {...form.register('confirmPassword')}
        />
        <AuthFormError
          message={
            updateMutation.error ? toAuthActionError(updateMutation.error).message : undefined
          }
        />
        <AuthSubmitButton
          loading={updateMutation.isPending}
          loadingLabel="ATUALIZANDO CREDENCIAL"
          type="submit"
        >
          Salvar nova senha
        </AuthSubmitButton>
      </form>
    </AuthScreen>
  );
}
