import * as Dialog from '@radix-ui/react-dialog';
import { Check, Circle, Eraser, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Spinner } from '../../../components/common/Spinner';
import { classNames } from '../../../lib/classNames';
import { isAndroidRuntime } from '../../../lib/platform';
import { useMyPresencePreferences, usePresenceActions } from '../../connections/presence.queries';
import {
  normalizePresenceMode,
  presenceModeInformation,
  type PresenceMode,
} from '../../connections/presence.types';
import { ProfileAvatar } from './ProfileAvatar';

const durationOptions = [
  { label: 'Não apagar automaticamente', value: 'never' },
  { label: 'Apagar em 1 hora', value: '60' },
  { label: 'Apagar em 4 horas', value: '240' },
  { label: 'Apagar em 1 dia', value: '1440' },
  { label: 'Apagar em 7 dias', value: '10080' },
] as const;

const presenceModes: PresenceMode[] = ['automatic', 'online', 'away', 'busy', 'invisible'];

export function PresenceStatusMenu({
  avatarPath,
  displayName,
  fallbackLabel,
  handle,
  positionX,
  positionY,
  zoom,
}: {
  avatarPath: null | string;
  displayName: string;
  fallbackLabel: string;
  handle: string;
  positionX?: number;
  positionY?: number;
  zoom?: number;
}) {
  const androidRuntime = isAndroidRuntime();
  const query = useMyPresencePreferences();
  const actions = usePresenceActions();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PresenceMode>('automatic');
  const [customStatus, setCustomStatus] = useState('');
  const [duration, setDuration] = useState('never');

  useEffect(() => {
    if (!open || !query.data) return;

    setMode(normalizePresenceMode(query.data.mode));
    setCustomStatus(query.data.customStatus ?? '');
    setDuration(durationFromExpiration(query.data.customStatusExpiresAt) ?? 'never');
  }, [open, query.data]);

  const selectedInformation = presenceModeInformation[mode];
  const compactLabel = useMemo(() => {
    if (query.data?.customStatus) return query.data.customStatus;

    const currentMode = normalizePresenceMode(query.data?.mode);
    if (currentMode === 'automatic') {
      const actual = query.data?.status;
      if (actual === 'away') return 'Ausente · Automático';
      if (actual === 'busy') return 'Ocupado · Automático';
      if (actual === 'online') return 'Online · Automático';
    }

    return query.data ? presenceModeInformation[currentMode].label : fallbackLabel;
  }, [fallbackLabel, query.data]);

  function save() {
    actions.save.mutate(
      {
        customStatus,
        durationMinutes: duration === 'never' ? null : Number(duration),
        mode,
      },
      {
        onSuccess: () => setOpen(false),
      },
    );
  }

  function clearCustomStatus() {
    actions.save.mutate(
      {
        customStatus: '',
        durationMinutes: null,
        mode,
      },
      {
        onSuccess: () => {
          setCustomStatus('');
          setOpen(false);
        },
      },
    );
  }

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button
          aria-label="Alterar status e presença"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none transition hover:bg-white/[0.045] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
          type="button"
        >
          <span className="relative shrink-0">
            <ProfileAvatar
              avatarPath={avatarPath}
              displayName={displayName}
              positionX={positionX}
              positionY={positionY}
              size="sm"
              zoom={zoom}
            />
            <span
              className={classNames(
                'absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-[3px] border-crypt-sidebar',
                presenceModeInformation[normalizePresenceMode(query.data?.mode)].tone,
              )}
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{displayName}</span>
            <span className="block truncate text-xs text-crypt-subtle">
              {compactLabel || (handle ? `@${handle}` : fallbackLabel)}
            </span>
          </span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-sm" />
        <Dialog.Content
          className={classNames(
            'fixed z-[81] max-h-[calc(100dvh-1rem)] overflow-y-auto border border-white/10 bg-crypt-panel shadow-2xl shadow-black/60 focus:outline-none',
            androidRuntime
              ? 'inset-x-0 bottom-0 rounded-t-[2rem] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7'
              : 'left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[1.85rem] p-6',
          )}
        >
          {androidRuntime ? (
            <span className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/25" />
          ) : null}

          <div className="pr-11">
            <Dialog.Title className="text-xl font-bold tracking-tight text-white">
              Status e presença
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-crypt-muted">
              Escolha como você aparece para seus amigos e defina uma mensagem curta.
            </Dialog.Description>
          </div>

          <Dialog.Close asChild>
            <button
              aria-label="Fechar status"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-xl text-crypt-muted transition hover:bg-white/[0.07] hover:text-white"
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </Dialog.Close>

          {query.isPending ? (
            <div className="grid min-h-52 place-items-center">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-2">
                {presenceModes.map((value) => {
                  const information = presenceModeInformation[value];
                  const selected = mode === value;

                  return (
                    <button
                      className={classNames(
                        'flex items-start gap-3 rounded-2xl border p-3.5 text-left transition',
                        selected
                          ? 'border-violet-400/40 bg-violet-500/[0.1]'
                          : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]',
                      )}
                      key={value}
                      onClick={() => setMode(value)}
                      type="button"
                    >
                      <span className="relative mt-0.5 grid size-8 shrink-0 place-items-center">
                        <Circle
                          aria-hidden="true"
                          className={classNames(
                            'fill-current',
                            information.tone.replace('bg-', 'text-'),
                          )}
                          size={18}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm text-white">{information.label}</strong>
                        <span className="mt-1 block text-xs leading-5 text-crypt-subtle">
                          {information.description}
                        </span>
                      </span>
                      {selected ? (
                        <Check
                          aria-label="Selecionado"
                          className="mt-1 text-violet-300"
                          size={17}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <label className="grid gap-2 text-sm font-semibold text-white">
                  Status personalizado
                  <input
                    className="min-h-11 rounded-xl border border-white/10 bg-crypt-elevated px-3 text-sm font-normal text-white outline-none placeholder:text-crypt-subtle focus:border-violet-400/60"
                    maxLength={128}
                    onChange={(event) => setCustomStatus(event.target.value)}
                    placeholder="Ex.: Trabalhando no Crypt"
                    value={customStatus}
                  />
                </label>
                <div className="mt-1 text-right text-[0.68rem] text-crypt-subtle">
                  {customStatus.length}/128
                </div>

                <label className="mt-4 grid gap-2 text-sm font-semibold text-white">
                  Remoção automática
                  <select
                    className="min-h-11 rounded-xl border border-white/10 bg-crypt-elevated px-3 text-sm font-normal text-white outline-none focus:border-violet-400/60"
                    disabled={!customStatus.trim()}
                    onChange={(event) => setDuration(event.target.value)}
                    value={duration}
                  >
                    {durationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {actions.save.error ? (
                <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.08] p-3 text-xs text-red-200">
                  {actions.save.error instanceof Error
                    ? actions.save.error.message
                    : 'Não foi possível salvar.'}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-between">
                <Button
                  disabled={!query.data?.customStatus && !customStatus}
                  leadingIcon={<Eraser aria-hidden="true" size={15} />}
                  loading={actions.save.isPending}
                  onClick={clearCustomStatus}
                  variant="ghost"
                >
                  Limpar mensagem
                </Button>
                <Button
                  leadingIcon={<Save aria-hidden="true" size={15} />}
                  loading={actions.save.isPending}
                  onClick={save}
                >
                  Salvar status
                </Button>
              </div>

              <p className="mt-4 text-center text-[0.68rem] leading-5 text-crypt-subtle">
                {selectedInformation.label}: {selectedInformation.description}
              </p>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function durationFromExpiration(value: null | string) {
  if (!value) return null;

  const remainingMinutes = Math.max(
    0,
    Math.round((new Date(value).getTime() - Date.now()) / 60_000),
  );

  if (remainingMinutes <= 90) return '60';
  if (remainingMinutes <= 360) return '240';
  if (remainingMinutes <= 2_160) return '1440';
  return '10080';
}
