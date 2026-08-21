import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AtSign, KeyRound, Mail, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toAuthActionError } from '../features/auth/auth.errors';
import { registerSchema, type RegisterValues } from '../features/auth/auth.schemas';
import { registerAccount } from '../features/auth/auth.service';
import { AuthConfigurationNotice } from '../features/auth/components/AuthConfigurationNotice';
import {
  useAuthExperience,
  waitForAuthTransition,
} from '../features/auth/components/useAuthExperience';
import { AuthField } from '../features/auth/components/AuthField';
import { AuthFormError } from '../features/auth/components/AuthFormError';
import { AuthScreen, AuthState } from '../features/auth/components/AuthScreen';
import { AuthSubmitButton } from '../features/auth/components/AuthSubmitButton';

export function RegisterRoute() {
  const navigate = useNavigate();
  const { setPhase } = useAuthExperience();
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
    onSuccess: async (result, values) => {
      setPhase('verified');
      if (result.requiresEmailConfirmation) {
        setConfirmationEmail(values.email);
        return;
      }

      await waitForAuthTransition();
      void navigate('/app', { replace: true });
    },
  });

  useEffect(() => {
    if (registerMutation.isPending) setPhase('loading');
    else if (registerMutation.error) setPhase('error');
  }, [registerMutation.error, registerMutation.isPending, setPhase]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await registerMutation.mutateAsync(values).catch(() => undefined);
  });

  if (confirmationEmail) {
    return (
      <AuthState
        action={
          <Link className="auth-state__button" to="/login">
            Voltar para o login
          </Link>
        }
        description={
          <>
            Enviamos uma confirmação para <strong>{confirmationEmail}</strong>. Abra a mensagem no
            mesmo dispositivo para concluir seu acesso.
          </>
        }
        icon="success"
        id="register-success-title"
        title="Identidade registrada"
      />
    );
  }

  return (
    <AuthScreen
      className="auth-screen--register"
      description="Crie uma identidade única para jogar, construir e conversar dentro da rede Crypt."
      eyebrow="Register new identity"
      id="register-title"
      step="02"
      title="Entre para a rede"
    >
      <AuthConfigurationNotice />

      <form
        className="auth-form auth-form--register"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
        <AuthField
          autoComplete="name"
          errorText={form.formState.errors.displayName?.message}
          label="Nome de exibição"
          icon={<UserRound aria-hidden="true" size={17} />}
          placeholder="Kaio Snow"
          required
          {...form.register('displayName')}
        />
        <AuthField
          autoCapitalize="none"
          autoComplete="username"
          errorText={form.formState.errors.handle?.message}
          helperText="De 3 a 24 caracteres: letras, números ou _."
          label="Identificador único"
          icon={<AtSign aria-hidden="true" size={17} />}
          placeholder="@kaiosnow"
          required
          spellCheck={false}
          {...form.register('handle')}
        />
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
          autoComplete="new-password"
          errorText={form.formState.errors.password?.message}
          helperText="Mínimo de 12 caracteres, com maiúscula, minúscula e número."
          label="Senha"
          icon={<KeyRound aria-hidden="true" size={17} />}
          required
          type="password"
          {...form.register('password')}
        />
        <AuthField
          autoComplete="new-password"
          errorText={form.formState.errors.confirmPassword?.message}
          label="Confirme a senha"
          icon={<KeyRound aria-hidden="true" size={17} />}
          required
          type="password"
          {...form.register('confirmPassword')}
        />

        <AuthFormError
          message={
            registerMutation.error ? toAuthActionError(registerMutation.error).message : undefined
          }
        />

        <AuthSubmitButton
          loading={registerMutation.isPending}
          loadingLabel="REGISTRANDO IDENTIDADE"
          type="submit"
        >
          Criar minha identidade
        </AuthSubmitButton>
      </form>

      <div className="auth-form__switch">
        <span>KNOWN IDENTITY</span>
        <p>Já possui uma conta?</p>
        <Link className="auth-link" to="/login">
          Entrar no Crypt
        </Link>
      </div>
    </AuthScreen>
  );
}
