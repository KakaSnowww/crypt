import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  ExternalLink,
  FileWarning,
  Gauge,
  Link2Off,
  MessageSquareWarning,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Spinner } from '../../../components/common/Spinner';
import { Textarea } from '../../../components/common/Textarea';
import { Toggle } from '../../../components/common/Toggle';
import { useToast } from '../../../components/common/ToastContext';
import { autoModKeys, useServerAutoModEvents, useServerAutoModSettings } from '../automod.queries';
import { saveServerAutoModSettings } from '../automod.service';
import {
  autoModRuleLabels,
  type ServerAutoModEvent,
  type ServerAutoModSettings,
} from '../automod.types';
import { ProfileAvatar } from '../../profile/components/ProfileAvatar';

export function AutoModPanel({ isOwner, serverId }: { isOwner: boolean; serverId: string }) {
  const settingsQuery = useServerAutoModSettings(serverId);
  const eventsQuery = useServerAutoModEvents(serverId);

  if (settingsQuery.isPending) {
    return (
      <div className="grid min-h-64 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (settingsQuery.error || !settingsQuery.data) {
    return (
      <section className="panel p-7 text-center">
        <FileWarning className="mx-auto text-amber-300" />
        <h2 className="mt-3 font-semibold text-white">AutoMod indisponível</h2>
        <p className="mt-2 text-sm text-crypt-muted">
          Aplique a migration deste bloco e tente novamente.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <AutoModSettingsForm
        isOwner={isOwner}
        key={settingsQuery.data.updated_at}
        serverId={serverId}
        settings={settingsQuery.data}
      />

      <AutoModEventFeed events={eventsQuery.data ?? []} loading={eventsQuery.isPending} />
    </div>
  );
}

function AutoModSettingsForm({
  isOwner,
  serverId,
  settings,
}: {
  isOwner: boolean;
  serverId: string;
  settings: ServerAutoModSettings;
}) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [spam, setSpam] = useState(settings.block_spam);
  const [duplicates, setDuplicates] = useState(settings.block_duplicates);
  const [blockInvites, setBlockInvites] = useState(settings.block_invite_links);
  const [blockExternal, setBlockExternal] = useState(settings.block_external_links);
  const [maxMessages, setMaxMessages] = useState(settings.max_messages);
  const [interval, setInterval] = useState(settings.interval_seconds);
  const [duplicateWindow, setDuplicateWindow] = useState(settings.duplicate_window_seconds);
  const [maxMentions, setMaxMentions] = useState(settings.max_mentions);
  const [termsText, setTermsText] = useState(settings.blocked_terms.join('\n'));

  useEffect(() => {
    setEnabled(settings.enabled);
  }, [settings.enabled]);

  const mutation = useMutation({
    mutationFn: async () => {
      const terms = termsText
        .split(/\r?\n|,/u)
        .map((term) => term.trim())
        .filter(Boolean);

      await saveServerAutoModSettings(serverId, {
        block_duplicates: duplicates,
        block_external_links: blockExternal,
        block_invite_links: blockInvites,
        block_spam: spam,
        blocked_terms: terms,
        duplicate_window_seconds: duplicateWindow,
        enabled,
        interval_seconds: interval,
        max_mentions: maxMentions,
        max_messages: maxMessages,
      });
    },
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível salvar o AutoMod',
        tone: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: autoModKeys.all(serverId),
      });
      addToast({
        message: 'As novas regras já estão valendo nos canais de texto.',
        title: 'AutoMod atualizado',
        tone: 'success',
      });
    },
  });

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
          <Bot size={21} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">Proteção automática</h2>
          <p className="mt-1 text-xs leading-5 text-crypt-subtle">
            Moderadores com permissão para gerenciar mensagens e o dono não são bloqueados.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <Toggle
          checked={enabled}
          description="Liga ou desliga todas as regras abaixo."
          disabled={!isOwner}
          label="Ativar AutoMod"
          onChange={setEnabled}
        />

        <Toggle
          checked={spam}
          description="Bloqueia rajadas acima do limite definido."
          disabled={!isOwner || !enabled}
          label="Proteção contra spam"
          onChange={setSpam}
        />

        <Toggle
          checked={duplicates}
          description="Impede repetir a mesma mensagem em pouco tempo."
          disabled={!isOwner || !enabled}
          label="Bloquear mensagens duplicadas"
          onChange={setDuplicates}
        />

        <Toggle
          checked={blockInvites}
          description="Bloqueia convites do Crypt e de outras plataformas."
          disabled={!isOwner || !enabled}
          label="Bloquear links de convite"
          onChange={setBlockInvites}
        />

        <Toggle
          checked={blockExternal}
          description="Bloqueia links HTTP, HTTPS e www."
          disabled={!isOwner || !enabled}
          label="Bloquear links externos"
          onChange={setBlockExternal}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Input
          disabled={!isOwner}
          label="Mensagens por rajada"
          max={20}
          min={3}
          onChange={(event) => setMaxMessages(Number(event.target.value))}
          type="number"
          value={maxMessages}
        />

        <Input
          disabled={!isOwner}
          label="Janela do spam em segundos"
          max={60}
          min={5}
          onChange={(event) => setInterval(Number(event.target.value))}
          type="number"
          value={interval}
        />

        <Input
          disabled={!isOwner}
          label="Repetição em segundos"
          max={300}
          min={10}
          onChange={(event) => setDuplicateWindow(Number(event.target.value))}
          type="number"
          value={duplicateWindow}
        />

        <Input
          disabled={!isOwner}
          label="Máximo de menções"
          max={20}
          min={1}
          onChange={(event) => setMaxMentions(Number(event.target.value))}
          type="number"
          value={maxMentions}
        />
      </div>

      <div className="mt-5">
        <Textarea
          disabled={!isOwner}
          helperText="Um termo por linha ou separado por vírgula. Máximo de 50 termos, com 2 a 40 caracteres."
          label="Termos bloqueados"
          maxLength={2200}
          onChange={(event) => setTermsText(event.target.value)}
          placeholder={'exemplo proibido\noutra expressão'}
          value={termsText}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isOwner ? (
          <Button
            leadingIcon={<Save size={16} />}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Salvar AutoMod
          </Button>
        ) : (
          <span className="text-xs text-crypt-subtle">
            Somente o proprietário pode alterar estas regras.
          </span>
        )}

        <span className="inline-flex items-center gap-1.5 text-[0.66rem] text-crypt-subtle">
          <ShieldCheck size={13} />
          Validação feita no banco
        </span>
      </div>
    </section>
  );
}

function AutoModEventFeed({ events, loading }: { events: ServerAutoModEvent[]; loading: boolean }) {
  return (
    <section className="panel overflow-hidden">
      <header className="border-b border-white/[0.07] p-5">
        <div className="flex items-center gap-2">
          <Gauge className="text-fuchsia-300" size={18} />
          <h2 className="font-semibold text-white">Bloqueios recentes</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-crypt-subtle">
          As últimas 100 tentativas bloqueadas neste servidor.
        </p>
      </header>

      {loading ? (
        <div className="grid min-h-48 place-items-center">
          <Spinner />
        </div>
      ) : events.length ? (
        <div className="max-h-[42rem] divide-y divide-white/[0.06] overflow-y-auto">
          {events.map((event) => {
            const RuleIcon =
              event.rule_code === 'external_link' || event.rule_code === 'invite_link'
                ? Link2Off
                : event.rule_code === 'spam_burst'
                  ? Gauge
                  : MessageSquareWarning;

            return (
              <article className="p-4" key={event.event_id}>
                <div className="flex items-start gap-3">
                  <ProfileAvatar
                    avatarPath={event.profile_avatar_path}
                    displayName={event.profile_display_name}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <strong className="truncate text-xs text-white">
                        {event.profile_display_name}
                      </strong>
                      <span className="text-[0.62rem] text-crypt-subtle">
                        @{event.profile_handle}
                      </span>
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-[0.66rem] font-semibold text-amber-200">
                      <RuleIcon size={12} />
                      {autoModRuleLabels[event.rule_code]}
                    </p>

                    {event.message_excerpt ? (
                      <p className="mt-2 line-clamp-3 rounded-lg bg-black/20 p-2 text-[0.66rem] leading-5 text-crypt-muted">
                        {event.message_excerpt}
                      </p>
                    ) : null}

                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.58rem] text-crypt-subtle">
                      <span>#{event.channel_name ?? 'canal removido'}</span>
                      <span>·</span>
                      <time dateTime={event.created_at}>
                        {new Date(event.created_at).toLocaleString('pt-BR')}
                      </time>
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center p-6 text-center">
          <div>
            <ExternalLink className="mx-auto text-emerald-300" size={25} />
            <h3 className="mt-3 text-sm font-semibold text-white">Nenhum bloqueio</h3>
            <p className="mt-2 text-xs leading-5 text-crypt-subtle">
              Os eventos aparecerão aqui quando uma regra impedir uma mensagem.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
