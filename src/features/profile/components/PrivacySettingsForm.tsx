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
    description: 'Permite que outras pessoas encontrem seu @ na busca limitada do Crypt.',
    field: 'discoverable_by_search',
    label: 'Aparecer na busca por @',
  },
  {
    description: 'Permite que outras pessoas enviem novos pedidos para você.',
    field: 'allow_friend_requests',
    label: 'Permitir pedidos de amizade',
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
      allow_friend_requests: settings.allow_friend_requests,
      direct_message_policy: settings.direct_message_policy,
      discoverable_by_search: settings.discoverable_by_search,
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
      <label className="grid gap-2 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
        <span className="text-sm font-medium text-white">
          Quem pode iniciar uma mensagem privada
        </span>
        <span className="text-xs leading-5 text-crypt-subtle">
          A escolha vale para novas conversas. Bloqueios sempre impedem o envio.
        </span>
        <select
          className="mt-1 min-h-11 rounded-xl border border-white/10 bg-crypt-elevated px-3 text-sm text-white outline-none focus:border-violet-400"
          {...form.register('direct_message_policy')}
        >
          <option value="anyone">Qualquer pessoa</option>
          <option value="friends">Somente amigos</option>
          <option value="shared_servers">Amigos ou membros do mesmo servidor</option>
          <option value="none">Não permitir novas conversas</option>
        </select>
      </label>
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
