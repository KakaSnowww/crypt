import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '../../../components/common/Button';
import { Toggle } from '../../../components/common/Toggle';
import { useToast } from '../../../components/common/ToastContext';
import { useAuth } from '../../auth/useAuth';
import { toProfileActionError } from '../profile.errors';
import { profileKeys } from '../profile.queries';
import { privacySchema, type PrivacyFormValues } from '../profile.schemas';
import { savePrivacySettings } from '../profile.service';
import type { ProfileSettings } from '../profile.types';

type PrivacySettingsFormProps = {
  onSaved?: () => void;
  settings: ProfileSettings;
  submitLabel?: string;
};

const toggleFields: Array<{
  description: string;
  field: keyof PrivacyFormValues;
  label: string;
}> = [
  {
    description: 'Outras pessoas poderão ver os chips selecionados no seu perfil.',
    field: 'show_interests_on_profile',
    label: 'Mostrar interesses no perfil',
  },
  {
    description: 'Permite usar sua seleção para explicar sugestões futuras de amizade.',
    field: 'use_interests_for_suggestions',
    label: 'Usar interesses nas sugestões',
  },
  {
    description: 'Tem prioridade sobre as duas opções acima e mantém toda a seleção privada.',
    field: 'hide_all_interests',
    label: 'Ocultar todos os interesses',
  },
  {
    description: 'Controlará quem poderá enviar convites quando as amizades forem implementadas.',
    field: 'allow_friend_requests',
    label: 'Permitir pedidos de amizade',
  },
  {
    description: 'Controlará novas conversas diretas na fase de mensagens privadas.',
    field: 'allow_direct_messages',
    label: 'Permitir mensagens privadas',
  },
  {
    description: 'Permite mostrar quando você estiver online, ausente ou ocupado.',
    field: 'show_online_status',
    label: 'Mostrar status online',
  },
  {
    description: 'Autoriza a exibição dessa informação sem revelar sua lista completa.',
    field: 'show_mutual_friends',
    label: 'Mostrar amigos em comum',
  },
  {
    description: 'Autoriza a exibição de comunidades compartilhadas.',
    field: 'show_mutual_servers',
    label: 'Mostrar servidores em comum',
  },
];

export function PrivacySettingsForm({
  onSaved,
  settings,
  submitLabel = 'Salvar privacidade',
}: PrivacySettingsFormProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const form = useForm<PrivacyFormValues>({
    defaultValues: {
      allow_direct_messages: settings.allow_direct_messages,
      allow_friend_requests: settings.allow_friend_requests,
      hide_all_interests: settings.hide_all_interests,
      show_interests_on_profile: settings.show_interests_on_profile,
      show_mutual_friends: settings.show_mutual_friends,
      show_mutual_servers: settings.show_mutual_servers,
      show_online_status: settings.show_online_status,
      use_interests_for_suggestions: settings.use_interests_for_suggestions,
    },
    resolver: zodResolver(privacySchema),
  });
  const mutation = useMutation({
    mutationFn: async (values: PrivacyFormValues) => {
      if (user) {
        await savePrivacySettings(user.id, values);
      }
    },
    onSuccess: async () => {
      if (!user) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: profileKeys.settings(user.id) });
      addToast({
        message: 'Suas escolhas de visibilidade já estão valendo.',
        title: 'Privacidade atualizada',
        tone: 'success',
      });
      onSaved?.();
    },
  });
  const watchedValues = useWatch({ control: form.control });

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) =>
        void form.handleSubmit(async (values) => {
          await mutation.mutateAsync(values).catch(() => undefined);
        })(event)
      }
    >
      {toggleFields.map((item) => (
        <Toggle
          checked={Boolean(watchedValues[item.field])}
          description={item.description}
          key={item.field}
          label={item.label}
          name={item.field}
          onChange={(checked) => form.setValue(item.field, checked, { shouldDirty: true })}
        />
      ))}
      {mutation.error ? (
        <p className="text-xs leading-5 text-red-300">
          {toProfileActionError(mutation.error).message}
        </p>
      ) : null}
      <Button
        className="mt-2 w-fit"
        leadingIcon={<ShieldCheck aria-hidden="true" size={16} />}
        loading={mutation.isPending}
        type="submit"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
