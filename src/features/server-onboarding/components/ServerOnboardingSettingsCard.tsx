import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpenCheck,
  CirclePlus,
  Hash,
  Save,
  Sparkles,
  Trash2,
  Video,
  Volume2,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Spinner } from '../../../components/common/Spinner';
import { Textarea } from '../../../components/common/Textarea';
import { Toggle } from '../../../components/common/Toggle';
import { useToast } from '../../../components/common/ToastContext';
import { workspaceKeys, useServerChannels } from '../../workspace/workspace.queries';
import { serverOnboardingKeys, useServerOnboardingStatus } from '../serverOnboarding.queries';
import { saveServerOnboardingSettings } from '../serverOnboarding.service';
import type { ServerOnboardingStatus } from '../serverOnboarding.types';

type DraftRule = {
  description: string;
  draftId: string;
  title: string;
};

export function ServerOnboardingSettingsCard({ serverId }: { serverId: string }) {
  const statusQuery = useServerOnboardingStatus(serverId);
  const channelsQuery = useServerChannels(serverId);

  if (statusQuery.isPending || channelsQuery.isPending) {
    return (
      <section className="panel mt-5 grid min-h-36 place-items-center p-5 sm:p-7">
        <Spinner />
      </section>
    );
  }

  if (statusQuery.error || !statusQuery.data) {
    return (
      <section className="panel mt-5 p-5 sm:p-7">
        <h2 className="font-semibold text-white">Entrada de novos membros</h2>
        <p className="mt-2 text-xs leading-5 text-red-300">
          Não foi possível carregar as configurações. Confirme se a migration deste bloco foi
          aplicada.
        </p>
      </section>
    );
  }

  if (!statusQuery.data.is_owner) {
    return null;
  }

  return (
    <ServerOnboardingSettingsForm
      channels={channelsQuery.data ?? []}
      key={`${statusQuery.data.settings_version}-` + `${statusQuery.data.enabled_at ?? 'off'}`}
      serverId={serverId}
      status={statusQuery.data}
    />
  );
}

function ServerOnboardingSettingsForm({
  channels,
  serverId,
  status,
}: {
  channels: Array<{
    channel_icon: null | string;
    channel_id: string;
    channel_name: string;
    channel_type: string;
    topic: null | string;
  }>;
  serverId: string;
  status: ServerOnboardingStatus;
}) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [enabled, setEnabled] = useState(status.onboarding_enabled);
  const [welcomeTitle, setWelcomeTitle] = useState(status.welcome_title);
  const [welcomeMessage, setWelcomeMessage] = useState(status.welcome_message);
  const [rulesRequired, setRulesRequired] = useState(status.rules_required);
  const [selectionRequired, setSelectionRequired] = useState(status.channel_selection_required);
  const [rules, setRules] = useState<DraftRule[]>(
    status.rules.map((rule) => ({
      description: rule.description ?? '',
      draftId: rule.rule_id,
      title: rule.title,
    })),
  );
  const [featuredChannelIds, setFeaturedChannelIds] = useState<string[]>(
    status.featured_channels.map((channel) => channel.channel_id),
  );

  const mutation = useMutation({
    mutationFn: () =>
      saveServerOnboardingSettings(serverId, {
        channelSelectionRequired: selectionRequired,
        enabled,
        featuredChannelIds,
        rules: rules.map(({ description, title }) => ({
          description,
          title,
        })),
        rulesRequired,
        welcomeMessage,
        welcomeTitle,
      }),
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível salvar a entrada',
        tone: 'error',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: serverOnboardingKeys.status(serverId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.channels(serverId),
        }),
      ]);

      addToast({
        message: enabled
          ? 'Novos membros já passarão pela tela de entrada.'
          : 'A entrada obrigatória foi desativada.',
        title: 'Entrada de membros atualizada',
        tone: 'success',
      });
    },
  });

  function addRule() {
    if (rules.length >= 10) {
      return;
    }

    setRules((current) => [
      ...current,
      {
        description: '',
        draftId: crypto.randomUUID(),
        title: '',
      },
    ]);
  }

  function updateRule(draftId: string, field: 'description' | 'title', value: string) {
    setRules((current) =>
      current.map((rule) =>
        rule.draftId === draftId
          ? {
              ...rule,
              [field]: value,
            }
          : rule,
      ),
    );
  }

  function removeRule(draftId: string) {
    setRules((current) => current.filter((rule) => rule.draftId !== draftId));
  }

  function toggleChannel(channelId: string) {
    setFeaturedChannelIds((current) =>
      current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : current.length < 8
          ? [...current, channelId]
          : current,
    );
  }

  return (
    <section aria-labelledby="member-entry-title" className="panel mt-5 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fuchsia-500/10 text-fuchsia-200">
          <BookOpenCheck aria-hidden="true" size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-white" id="member-entry-title">
            Entrada de novos membros
          </h2>
          <p className="mt-1 text-xs leading-5 text-crypt-subtle">
            Membros antigos não serão bloqueados. A experiência vale apenas para quem entrar após a
            ativação.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <Toggle
          checked={enabled}
          description="Mostra boas-vindas, regras e canais antes de liberar o servidor."
          label="Ativar entrada guiada"
          onChange={setEnabled}
        />
        <Toggle
          checked={rulesRequired}
          description="Exige a confirmação de todas as regras configuradas."
          disabled={rules.length === 0}
          label="Exigir aceite das regras"
          onChange={setRulesRequired}
        />
        <Toggle
          checked={selectionRequired}
          description="Exige que a pessoa escolha pelo menos um canal recomendado."
          disabled={featuredChannelIds.length === 0}
          label="Exigir escolha de canal"
          onChange={setSelectionRequired}
        />
      </div>

      <div className="mt-6 grid gap-4">
        <Input
          label="Título de boas-vindas"
          maxLength={80}
          onChange={(event) => setWelcomeTitle(event.target.value)}
          value={welcomeTitle}
        />
        <Textarea
          helperText={`${welcomeMessage.length}/1000`}
          label="Mensagem de boas-vindas"
          maxLength={1000}
          onChange={(event) => setWelcomeMessage(event.target.value)}
          value={welcomeMessage}
        />
      </div>

      <div className="mt-7 border-t border-white/[0.07] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Regras</h3>
            <p className="mt-1 text-xs text-crypt-subtle">
              Até 10 regras. A ordem exibida segue esta lista.
            </p>
          </div>
          <Button
            disabled={rules.length >= 10}
            leadingIcon={<CirclePlus size={15} />}
            onClick={addRule}
            size="sm"
            variant="secondary"
          >
            Adicionar regra
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          {rules.map((rule, index) => (
            <article
              className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
              key={rule.draftId}
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-xs text-violet-200">Regra {index + 1}</strong>
                <button
                  aria-label={`Remover regra ${index + 1}`}
                  className="grid size-8 place-items-center rounded-lg text-crypt-subtle hover:bg-red-500/10 hover:text-red-200"
                  onClick={() => removeRule(rule.draftId)}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                <Input
                  label="Título"
                  maxLength={80}
                  onChange={(event) => updateRule(rule.draftId, 'title', event.target.value)}
                  value={rule.title}
                />
                <Textarea
                  helperText="Opcional, até 500 caracteres"
                  label="Explicação"
                  maxLength={500}
                  onChange={(event) => updateRule(rule.draftId, 'description', event.target.value)}
                  value={rule.description}
                />
              </div>
            </article>
          ))}

          {!rules.length ? (
            <p className="rounded-2xl border border-dashed border-white/[0.09] p-5 text-center text-xs text-crypt-subtle">
              Adicione as regras que a pessoa deverá conhecer antes de entrar.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-7 border-t border-white/[0.07] pt-6">
        <div>
          <h3 className="font-semibold text-white">Canais recomendados</h3>
          <p className="mt-1 text-xs leading-5 text-crypt-subtle">
            Escolha até oito canais. A pessoa poderá selecionar até cinco e o primeiro escolhido
            será aberto automaticamente.
          </p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {channels.map((channel) => {
            const selected = featuredChannelIds.includes(channel.channel_id);
            const Icon =
              channel.channel_type === 'voice'
                ? Volume2
                : channel.channel_type === 'video'
                  ? Video
                  : Hash;

            return (
              <button
                aria-pressed={selected}
                className={`flex min-w-0 items-start gap-3 rounded-2xl border p-3 text-left transition ${
                  selected
                    ? 'border-violet-400/45 bg-violet-500/12'
                    : 'border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]'
                }`}
                key={channel.channel_id}
                onClick={() => toggleChannel(channel.channel_id)}
                type="button"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-violet-200">
                  {channel.channel_icon ? channel.channel_icon : <Icon size={15} />}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-xs text-white">
                    {channel.channel_name}
                  </strong>
                  <span className="mt-1 line-clamp-2 block text-[0.65rem] leading-5 text-crypt-subtle">
                    {channel.topic ?? 'Canal do servidor'}
                  </span>
                </span>
                {selected ? (
                  <Sparkles className="ml-auto shrink-0 text-violet-300" size={14} />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-5">
        <Button
          disabled={
            !welcomeTitle.trim() ||
            !welcomeMessage.trim() ||
            rules.some((rule) => rule.title.trim().length < 2)
          }
          leadingIcon={<Save size={16} />}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Salvar entrada
        </Button>
        <span className="text-[0.66rem] text-crypt-subtle">
          Versão atual: {status.settings_version}
        </span>
      </div>
    </section>
  );
}
