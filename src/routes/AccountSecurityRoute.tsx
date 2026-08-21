import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/ToastContext';
import { toAuthActionError } from '../features/auth/auth.errors';
import {
  accountDeletionSchema,
  passwordUpdateSchema,
  type AccountDeletionValues,
  type PasswordUpdateValues,
} from '../features/auth/auth.schemas';
import { deleteAccount, updatePassword } from '../features/auth/auth.service';
import { AuthFormError } from '../features/auth/components/AuthFormError';
import { useAuth } from '../features/auth/useAuth';
import { DesktopUpdatePanel } from '../features/desktopUpdates/DesktopUpdatePanel';
import { AndroidUpdatePanel } from '../features/androidUpdates/AndroidUpdatePanel';
import { SettingsNavigation } from '../features/profile/components/SettingsNavigation';
import { SoundSettingsPanel } from '../features/settings/SoundSettingsPanel';
import { WindowsStartupPanel } from '../features/settings/WindowsStartupPanel';

export function AccountSecurityRoute() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { signOut, user } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const passwordForm = useForm<PasswordUpdateValues>({
    defaultValues: { confirmPassword: '', password: '' },
    resolver: zodResolver(passwordUpdateSchema),
  });
  const deletionForm = useForm<AccountDeletionValues>({
    defaultValues: { confirmation: '', password: '' },
    resolver: zodResolver(accountDeletionSchema),
  });
  const passwordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      passwordForm.reset();
      addToast({
        message: 'Sua nova senha já está protegendo esta conta.',
        title: 'Senha atualizada',
        tone: 'success',
      });
    },
  });
  const deletionMutation = useMutation({
    mutationFn: async (values: AccountDeletionValues) => {
      if (!user?.email) {
        throw new Error('Esta conta não possui um e-mail disponível.');
      }

      await deleteAccount(user.email, values);
    },
    onSuccess: () => void navigate('/login', { replace: true }),
  });

  async function handleLogout() {
    try {
      await signOut();
      void navigate('/login', { replace: true });
    } catch {
      addToast({
        message: 'Conecte o celular à internet para remover os avisos desta conta com segurança.',
        title: 'Não foi possível sair agora',
        tone: 'error',
      });
    }
  }

  return (
    <main className="settings-center mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="settings-center__layout">
        <SettingsNavigation />
        <div className="settings-center__content">
          <p className="eyebrow">Conta e segurança</p>
          <h1 className="settings-title mt-3 text-3xl font-bold tracking-tight">
            Proteja seu acesso
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
            Sua senha permanece exclusivamente no Supabase Auth e nunca é salva na tabela pública de
            perfis.
          </p>

          <section className="settings-page mt-8 p-5 sm:p-7" aria-labelledby="session-title">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <ShieldCheck aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 className="font-semibold text-white" id="session-title">
                  Sessão ativa
                </h2>
                <p className="mt-1 text-sm text-crypt-muted">{user?.email}</p>
              </div>
            </div>
            <Button
              className="mt-5"
              leadingIcon={<LogOut aria-hidden="true" size={17} />}
              onClick={() => void handleLogout()}
              variant="secondary"
            >
              Sair neste dispositivo
            </Button>
          </section>

          <section className="settings-page mt-5 p-5 sm:p-7" aria-labelledby="password-title">
            <h2 className="text-lg font-semibold text-white" id="password-title">
              Alterar senha
            </h2>
            <form
              className="mt-5 grid max-w-lg gap-5"
              noValidate
              onSubmit={(event) =>
                void passwordForm.handleSubmit(async (values) => {
                  await passwordMutation.mutateAsync(values).catch(() => undefined);
                })(event)
              }
            >
              <Input
                autoComplete="new-password"
                errorText={passwordForm.formState.errors.password?.message}
                label="Nova senha"
                leadingIcon={<KeyRound aria-hidden="true" size={17} />}
                required
                type="password"
                {...passwordForm.register('password')}
              />
              <Input
                autoComplete="new-password"
                errorText={passwordForm.formState.errors.confirmPassword?.message}
                label="Confirme a nova senha"
                leadingIcon={<KeyRound aria-hidden="true" size={17} />}
                required
                type="password"
                {...passwordForm.register('confirmPassword')}
              />
              <AuthFormError
                message={
                  passwordMutation.error
                    ? toAuthActionError(passwordMutation.error).message
                    : undefined
                }
              />
              <Button className="w-fit" loading={passwordMutation.isPending} type="submit">
                Atualizar senha
              </Button>
            </form>
          </section>

          <DesktopUpdatePanel />
          <AndroidUpdatePanel />
          <SoundSettingsPanel />
          <WindowsStartupPanel />

          <section
            className="mt-5 rounded-[1.75rem] border border-red-400/15 bg-red-500/[0.06] p-5 sm:p-7"
            aria-labelledby="danger-title"
          >
            <h2 className="text-lg font-semibold text-red-100" id="danger-title">
              Zona de perigo
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-crypt-muted">
              A exclusão remove o usuário do sistema de autenticação e o perfil relacionado. Esta
              ação não pode ser desfeita.
            </p>
            <Button
              className="mt-5"
              leadingIcon={<Trash2 aria-hidden="true" size={17} />}
              onClick={() => setDeleteModalOpen(true)}
              variant="danger"
            >
              Excluir minha conta
            </Button>
          </section>

          <Modal
            description="Confirme sua senha atual e a palavra EXCLUIR. A função administrativa roda somente no servidor."
            footer={
              <>
                <Button onClick={() => setDeleteModalOpen(false)} variant="secondary">
                  Cancelar
                </Button>
                <Button
                  form="delete-account-form"
                  loading={deletionMutation.isPending}
                  type="submit"
                  variant="danger"
                >
                  Excluir definitivamente
                </Button>
              </>
            }
            onOpenChange={setDeleteModalOpen}
            open={deleteModalOpen}
            title="Excluir sua conta?"
          >
            <form
              className="grid gap-5"
              id="delete-account-form"
              noValidate
              onSubmit={(event) =>
                void deletionForm.handleSubmit(async (values) => {
                  await deletionMutation.mutateAsync(values).catch(() => undefined);
                })(event)
              }
            >
              <Input
                autoComplete="current-password"
                errorText={deletionForm.formState.errors.password?.message}
                label="Senha atual"
                required
                type="password"
                {...deletionForm.register('password')}
              />
              <Input
                autoComplete="off"
                errorText={deletionForm.formState.errors.confirmation?.message}
                label="Digite EXCLUIR"
                required
                {...deletionForm.register('confirmation')}
              />
              <AuthFormError
                message={
                  deletionMutation.error
                    ? toAuthActionError(deletionMutation.error).message
                    : undefined
                }
              />
            </form>
          </Modal>
        </div>
      </div>
    </main>
  );
}
