import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Textarea } from '../../../components/common/Textarea';
import { useToast } from '../../../components/common/ToastContext';
import { useAuth } from '../../auth/useAuth';
import { toProfileActionError } from '../profile.errors';
import { profileKeys } from '../profile.queries';
import { profileDetailsSchema, type ProfileDetailsValues } from '../profile.schemas';
import { saveProfileDetails } from '../profile.service';
import type { Profile } from '../profile.types';

type ProfileDetailsFormProps = {
  disabled?: boolean;
  onSaved?: () => void;
  profile: Profile;
  submitLabel?: string;
};

export function ProfileDetailsForm({
  disabled = false,
  onSaved,
  profile,
  submitLabel = 'Salvar apresentação',
}: ProfileDetailsFormProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const form = useForm<ProfileDetailsValues>({
    defaultValues: {
      bio: profile.bio ?? '',
      displayName: profile.display_name,
    },
    resolver: zodResolver(profileDetailsSchema),
  });
  const mutation = useMutation({
    mutationFn: async (values: ProfileDetailsValues) => {
      if (user) {
        await saveProfileDetails(user.id, values);
      }
    },
    onSuccess: async () => {
      if (!user) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: profileKeys.current(user.id) });
      addToast({
        message: 'Nome e biografia atualizados.',
        title: 'Perfil salvo',
        tone: 'success',
      });
      onSaved?.();
    },
  });
  const bio = useWatch({ control: form.control, name: 'bio' });

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        void form.handleSubmit(async (values) => {
          await mutation.mutateAsync(values).catch(() => undefined);
        })(event);
      }}
    >
      <Input
        autoComplete="name"
        errorText={form.formState.errors.displayName?.message}
        label="Nome de exibição"
        required
        {...form.register('displayName')}
      />
      <Textarea
        errorText={form.formState.errors.bio?.message}
        helperText={`${bio.length}/280 — conte um pouco sobre você, se quiser.`}
        label="Biografia"
        placeholder="O que as pessoas deveriam saber sobre você?"
        {...form.register('bio')}
      />
      {mutation.error ? (
        <p className="text-xs leading-5 text-red-300">
          {toProfileActionError(mutation.error).message}
        </p>
      ) : null}
      <Button
        className="w-fit"
        disabled={disabled}
        leadingIcon={<Save aria-hidden="true" size={16} />}
        loading={mutation.isPending}
        type="submit"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
