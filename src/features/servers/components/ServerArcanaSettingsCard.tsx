import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Gem, LockKeyhole, Palette, RotateCcw, Save } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { useToast } from '../../../components/common/ToastContext';
import { serverArcanaKeys, useServerArcanaStatus } from '../serverArcana.queries';
import { clearServerArcanaGradient, saveServerArcanaGradient } from '../serverArcana.service';
import { getServerCirclePalette } from '../serverArcana.types';
import '../serverArcana.css';

export function ServerArcanaSettingsCard({ serverId }: { serverId: string }) {
  const statusQuery = useServerArcanaStatus(serverId);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [start, setStart] = useState('#6366F1');
  const [end, setEnd] = useState('#2563EB');
  const [angle, setAngle] = useState(135);

  const status = statusQuery.data;

  useEffect(() => {
    if (!status) {
      return;
    }

    const palette = getServerCirclePalette(status);
    const synchronizeTimeout = window.setTimeout(() => {
      setStart(palette.start);
      setEnd(palette.end);
      setAngle(palette.angle);
    }, 0);

    return () => window.clearTimeout(synchronizeTimeout);
  }, [status]);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: serverArcanaKeys.detail(serverId),
      }),
      queryClient.invalidateQueries({
        queryKey: serverArcanaKeys.list,
      }),
    ]);
  }

  const save = useMutation({
    mutationFn: () => saveServerArcanaGradient(serverId, start, end, angle),
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível salvar o gradiente',
        tone: 'error',
      });
    },
    onSuccess: async () => {
      await refresh();
      addToast({
        message: 'A nova identidade já aparece para todos os membros.',
        title: 'Gradiente do servidor salvo',
        tone: 'success',
      });
    },
  });

  const clear = useMutation({
    mutationFn: () => clearServerArcanaGradient(serverId),
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível restaurar as cores',
        tone: 'error',
      });
    },
    onSuccess: async () => {
      await refresh();
      addToast({
        message: 'O servidor voltou às cores automáticas do Círculo.',
        title: 'Gradiente restaurado',
        tone: 'info',
      });
    },
  });

  if (statusQuery.isPending || statusQuery.error || !status) {
    return null;
  }

  const unlocked = status.custom_gradient_unlocked;
  const previewStyle = {
    '--server-gradient-angle': `${angle}deg`,
    '--server-gradient-end': end,
    '--server-gradient-start': start,
  } as CSSProperties;

  return (
    <section aria-labelledby="server-gradient-title" className="panel mt-5 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fuchsia-500/10 text-fuchsia-200">
          <Gem aria-hidden="true" size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-white" id="server-gradient-title">
            Identidade do Círculo
          </h2>
          <p className="mt-1 text-xs leading-5 text-crypt-subtle">
            Personalização coletiva alimentada pelas Runas ativas do servidor.
          </p>
        </div>
      </div>

      {!unlocked ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <LockKeyhole className="shrink-0 text-amber-200" size={18} />
          <div>
            <strong className="text-sm text-white">Círculo Elevado necessário</strong>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Alcance 7 Runas ativas para escolher gradiente próprio. O servidor possui{' '}
              {status.rune_count}.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          <div
            aria-label="Prévia do gradiente"
            className="server-arcana-gradient-preview"
            style={previewStyle}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-semibold text-white">
              Primeira cor
              <input
                className="server-arcana-color-input"
                onChange={(event) => setStart(event.target.value)}
                type="color"
                value={start}
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold text-white">
              Segunda cor
              <input
                className="server-arcana-color-input"
                onChange={(event) => setEnd(event.target.value)}
                type="color"
                value={end}
              />
            </label>
          </div>

          <label className="grid gap-2 text-xs font-semibold text-white">
            Ângulo: {angle}°
            <input
              max={360}
              min={0}
              onChange={(event) => setAngle(Number(event.target.value))}
              type="range"
              value={angle}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              leadingIcon={<Save aria-hidden="true" size={15} />}
              loading={save.isPending}
              onClick={() => save.mutate()}
              size="sm"
            >
              Salvar gradiente
            </Button>

            <Button
              leadingIcon={<RotateCcw aria-hidden="true" size={15} />}
              loading={clear.isPending}
              onClick={() => clear.mutate()}
              size="sm"
              variant="secondary"
            >
              Usar cores automáticas
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-start gap-2 border-t border-white/[0.07] pt-4 text-xs leading-5 text-crypt-subtle">
        <Palette aria-hidden="true" className="mt-0.5 shrink-0 text-violet-300" size={15} />O
        Círculo Desperto já libera ícone e banner animados em GIF.
      </div>
    </section>
  );
}
