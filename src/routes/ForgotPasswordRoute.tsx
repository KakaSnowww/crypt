import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toAuthActionError } from '../features/auth/auth.errors';
import { passwordRecoverySchema, type PasswordRecoveryValues } from '../features/auth/auth.schemas';
import { requestPasswordRecovery } from '../features/auth/auth.service';
import { AuthConfigurationNotice } from '../features/auth/components/AuthConfigurationNotice';
import { useAuthExperience } from '../features/auth/components/useAuthExperience';
import { AuthField } from '../features/auth/components/AuthField';
import { AuthFormError } from '../features/auth/components/AuthFormError';
import { AuthScreen, AuthState } from '../features/auth/components/AuthScreen';
import { AuthSubmitButton } from '../features/auth/components/AuthSubmitButton';

export function ForgotPasswordRoute() {
  const [requestCompleted, setRequestCompleted] = useState(false);
  const { setPhase } = useAuthExperience();
  const form = useForm<PasswordRecoveryValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(passwordRecoverySchema),
  });
  const recoveryMutation = useMutation({
    mutationFn: requestPasswordRecovery,
    onSuccess: () => {
      setPhase('verified');
      setRequestCompleted(true);
    },
  });

  useEffect(() => {
    if (recoveryMutation.isPending) setPhase('loading');
    else if (recoveryMutation.error) setPhase('error');
  }, [recoveryMutation.error, recoveryMutation.isPending, setPhase]);
  const handleSubmit = form.handleSubmit(async (values) => {
    await recoveryMutation.mutateAsync(values).catch(() => undefined);
  });

  if (requestCompleted) {
    return (
      <AuthState
        action={
          <Link className="auth-state__button" to="/login">
            Voltar para o login
          </Link>
        }
        description="Se houver uma conta com esse e-mail, o canal seguro de recuperação já foi solicitado."
        icon="success"
        id="recovery-success-title"
        title="Canal de recuperação enviado"
      />
    );
  }

  return (
    <AuthScreen
      description="Informe o e-mail da identidade. Por privacidade, a resposta será a mesma mesmo se ele não estiver cadastrado."
      eyebrow="Recovery channel"
      id="recovery-title"
      step="03"
      title="Recuperar acesso"
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
        <AuthFormError
          message={
            recoveryMutation.error ? toAuthActionError(recoveryMutation.error).message : undefined
          }
        />
        <AuthSubmitButton
          loading={recoveryMutation.isPending}
          loadingLabel="SOLICITANDO CANAL"
          type="submit"
        >
          Enviar recuperação
        </AuthSubmitButton>
      </form>

      <div className="auth-form__switch">
        <span>KNOWN CREDENTIAL</span>
        <p>Lembrou sua senha?</p>
        <Link className="auth-link" to="/login">
          Voltar ao login
        </Link>
      </div>
    </AuthScreen>
  );
}
