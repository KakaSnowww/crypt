import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  Compass,
  DoorOpen,
  Hash,
  ShieldCheck,
  Sparkles,
  Video,
  Volume2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../components/common/ToastContext';
import {
  buildServerChannelPath,
  rememberServerChannel,
} from '../features/servers/serverNavigation';
import { ServerIcon } from '../features/servers/components/ServerIcon';
import { getServerMediaUrl } from '../features/servers/servers.service';
import {
  serverOnboardingKeys,
  useServerOnboardingStatus,
} from '../features/server-onboarding/serverOnboarding.queries';
import { completeServerOnboarding } from '../features/server-onboarding/serverOnboarding.service';
import type { ServerOnboardingChannel } from '../features/server-onboarding/serverOnboarding.types';
import '../features/server-onboarding/server-onboarding.css';
import { workspaceKeys } from '../features/workspace/workspace.queries';

type Step = 'channels' | 'rules' | 'welcome';

export function ServerOnboardingRoute() {
  const { serverId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const query = useServerOnboardingStatus(serverId);
  const [stepIndex, setStepIndex] = useState(0);
  const [acceptedRuleIds, setAcceptedRuleIds] = useState<string[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

  const steps = useMemo<Step[]>(() => {
    const status = query.data;
    const result: Step[] = ['welcome'];

    if (status?.rules.length) {
      result.push('rules');
    }

    if (status?.featured_channels.length) {
      result.push('channels');
    }

    return result;
  }, [query.data]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)] ?? 'welcome';

  useEffect(() => {
    const status = query.data;

    if (status && !status.onboarding_required) {
      void navigate(`/app/servidores/${serverId}/abrir`, {
        replace: true,
      });
    }
  }, [navigate, query.data, serverId]);

  const mutation = useMutation({
    mutationFn: () => completeServerOnboarding(serverId, acceptedRuleIds, selectedChannelIds),
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível concluir a entrada',
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
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.unread(serverId),
        }),
      ]);

      const selectedChannel = query.data?.featured_channels.find((channel) =>
        selectedChannelIds.includes(channel.channel_id),
      );

      if (selectedChannel) {
        rememberServerChannel(serverId, selectedChannel.channel_id);
        void navigate(buildServerChannelPath(serverId, selectedChannel), {
          replace: true,
        });
      } else {
        void navigate(`/app/servidores/${serverId}/abrir`, {
          replace: true,
        });
      }

      addToast({
        message: 'Os canais do servidor foram liberados.',
        title: 'Entrada concluída',
        tone: 'success',
      });
    },
  });

  if (query.isPending) {
    return (
      <main className="grid min-h-72 place-items-center p-6">
        <Spinner />
      </main>
    );
  }

  const status = query.data;

  if (query.error || !status) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <section className="panel p-8 text-center">
          <ShieldCheck className="mx-auto text-amber-300" />
          <h1 className="mt-4 text-xl font-semibold text-white">Entrada indisponível</h1>
          <p className="mt-2 text-sm text-crypt-muted">
            Você pode não fazer mais parte deste servidor ou a configuração ainda não foi aplicada.
          </p>
          <Button className="mt-5" onClick={() => void navigate('/app/servidores')}>
            Ver servidores
          </Button>
        </section>
      </main>
    );
  }

  const bannerUrl = getServerMediaUrl(status.banner_path);
  const allRulesAccepted =
    !status.rules_required || status.rules.every((rule) => acceptedRuleIds.includes(rule.rule_id));
  const channelSelectionReady = !status.channel_selection_required || selectedChannelIds.length > 0;
  const lastStep = stepIndex >= steps.length - 1;
  const canContinue = currentStep !== 'rules' || allRulesAccepted;

  function toggleRule(ruleId: string) {
    setAcceptedRuleIds((current) =>
      current.includes(ruleId) ? current.filter((id) => id !== ruleId) : [...current, ruleId],
    );
  }

  function toggleChannel(channel: ServerOnboardingChannel) {
    setSelectedChannelIds((current) =>
      current.includes(channel.channel_id)
        ? current.filter((id) => id !== channel.channel_id)
        : current.length < 5
          ? [...current, channel.channel_id]
          : current,
    );
  }

  function handlePrimaryAction() {
    if (!lastStep) {
      if (canContinue) {
        setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      }

      return;
    }

    if (allRulesAccepted && channelSelectionReady) {
      mutation.mutate();
    }
  }

  return (
    <main className="server-entry-page px-4 py-7 sm:px-6 sm:py-10">
      <span className="server-entry-constellations" />

      <section className="server-entry-card mx-auto w-full max-w-4xl">
        <div
          className="server-entry-banner"
          style={
            bannerUrl
              ? {
                  backgroundImage: `url("${bannerUrl}")`,
                }
              : undefined
          }
        />

        <div className="relative p-5 sm:p-8">
          <div className="-mt-16 flex items-end gap-4 sm:-mt-20">
            <span className="rounded-[1.65rem] border-4 border-[#0b0f19] bg-[#0b0f19] p-1">
              <ServerIcon iconPath={status.icon_path} name={status.server_name} size="lg" />
            </span>
            <div className="min-w-0 pb-1">
              <p className="eyebrow flex items-center gap-1.5">
                <Sparkles size={13} />
                Entrada no servidor
              </p>
              <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                {status.server_name}
              </h1>
            </div>
          </div>

          <div className="server-entry-progress mt-6">
            {steps.map((step, index) => (
              <span
                aria-label={
                  index <= stepIndex
                    ? `Etapa ${index + 1} concluída ou atual`
                    : `Etapa ${index + 1} pendente`
                }
                className={index <= stepIndex ? 'is-complete' : ''}
                key={step}
              />
            ))}
          </div>

          <div className="mt-7 min-h-80">
            {currentStep === 'welcome' ? (
              <WelcomeStep
                description={status.server_description}
                message={status.welcome_message}
                title={status.welcome_title}
              />
            ) : null}

            {currentStep === 'rules' ? (
              <RulesStep
                acceptedRuleIds={acceptedRuleIds}
                required={status.rules_required}
                rules={status.rules}
                toggleRule={toggleRule}
              />
            ) : null}

            {currentStep === 'channels' ? (
              <ChannelsStep
                channels={status.featured_channels}
                required={status.channel_selection_required}
                selectedChannelIds={selectedChannelIds}
                toggleChannel={toggleChannel}
              />
            ) : null}
          </div>

          {!allRulesAccepted && currentStep === 'rules' ? (
            <p className="mt-4 text-xs text-amber-200">
              Confirme todas as regras obrigatórias para continuar.
            </p>
          ) : null}

          {!channelSelectionReady && currentStep === 'channels' ? (
            <p className="mt-4 text-xs text-amber-200">Escolha pelo menos um canal recomendado.</p>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              disabled={stepIndex === 0}
              leadingIcon={<ArrowLeft size={15} />}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              variant="ghost"
            >
              Voltar
            </Button>

            <Button
              disabled={!canContinue || (lastStep && (!allRulesAccepted || !channelSelectionReady))}
              leadingIcon={lastStep ? <DoorOpen size={16} /> : <ArrowRight size={16} />}
              loading={mutation.isPending}
              onClick={handlePrimaryAction}
            >
              {lastStep ? 'Entrar no servidor' : 'Continuar'}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function WelcomeStep({
  description,
  message,
  title,
}: {
  description: null | string;
  message: string;
  title: string;
}) {
  return (
    <div className="grid min-h-72 place-items-center text-center">
      <div className="max-w-2xl">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-500/12 text-violet-200">
          <Compass size={25} />
        </span>
        <h2 className="mt-5 text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        <p className="mt-4 text-sm leading-7 text-crypt-muted">{message}</p>
        {description ? (
          <p className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs leading-6 text-crypt-subtle">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RulesStep({
  acceptedRuleIds,
  required,
  rules,
  toggleRule,
}: {
  acceptedRuleIds: string[];
  required: boolean;
  rules: Array<{
    description: null | string;
    rule_id: string;
    title: string;
  }>;
  toggleRule: (ruleId: string) => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-fuchsia-500/10 text-fuchsia-200">
          <BookOpenCheck size={21} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">Regras da comunidade</h2>
          <p className="mt-1 text-xs leading-5 text-crypt-subtle">
            {required ? 'Leia e confirme cada item.' : 'Conheça os princípios deste servidor.'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {rules.map((rule, index) => {
          const accepted = acceptedRuleIds.includes(rule.rule_id);

          return (
            <button
              aria-pressed={accepted}
              className={`server-entry-rule flex items-start gap-3 rounded-2xl p-4 text-left ${
                accepted ? 'is-accepted' : ''
              }`}
              key={rule.rule_id}
              onClick={() => toggleRule(rule.rule_id)}
              type="button"
            >
              <span className="server-entry-check mt-0.5">
                <Check size={13} />
              </span>
              <span>
                <strong className="text-sm text-white">
                  {index + 1}. {rule.title}
                </strong>
                {rule.description ? (
                  <span className="mt-1.5 block text-xs leading-6 text-crypt-muted">
                    {rule.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChannelsStep({
  channels,
  required,
  selectedChannelIds,
  toggleChannel,
}: {
  channels: ServerOnboardingChannel[];
  required: boolean;
  selectedChannelIds: string[];
  toggleChannel: (channel: ServerOnboardingChannel) => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-blue-500/10 text-blue-200">
          <Compass size={21} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">Por onde deseja começar?</h2>
          <p className="mt-1 text-xs leading-5 text-crypt-subtle">
            Escolha até cinco canais.
            {required ? ' Pelo menos um é obrigatório.' : ' Esta etapa é opcional.'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {channels.map((channel) => {
          const selected = selectedChannelIds.includes(channel.channel_id);
          const Icon =
            channel.channel_type === 'voice'
              ? Volume2
              : channel.channel_type === 'video'
                ? Video
                : Hash;

          return (
            <button
              aria-pressed={selected}
              className={`server-entry-channel flex min-w-0 items-start gap-3 rounded-2xl p-4 text-left ${
                selected ? 'is-selected' : ''
              }`}
              key={channel.channel_id}
              onClick={() => toggleChannel(channel)}
              type="button"
            >
              <span className="server-entry-check mt-0.5">
                <Check size={13} />
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-blue-200">
                {channel.channel_icon ? channel.channel_icon : <Icon size={15} />}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm text-white">
                  {channel.channel_name}
                </strong>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-crypt-muted">
                  {channel.topic ?? 'Canal recomendado'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
