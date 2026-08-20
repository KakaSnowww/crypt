import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, Paintbrush, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/ToastContext';
import { useAuth } from '../auth/useAuth';
import { profileKeys } from '../profile/profile.queries';
import type { Profile } from '../profile/profile.types';
import { toProfileActionError } from '../profile/profile.errors';
import { useArcanaMembership } from './arcana.queries';
import { clearProfileGradient, saveProfileGradient } from './arcana.service';
export function ProfileGradientEditor({ profile }: { profile: Profile }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const membership = useArcanaMembership();
  const [start, setStart] = useState(profile.profile_gradient_start ?? '#7C3AED');
  const [end, setEnd] = useState(profile.profile_gradient_end ?? '#2563EB');
  const [angle, setAngle] = useState(profile.profile_gradient_angle);
  const refresh = async () => {
    if (user) await queryClient.invalidateQueries({ queryKey: profileKeys.current(user.id) });
  };
  const save = useMutation({
    mutationFn: () => saveProfileGradient(start, end, angle),
    onSuccess: async () => {
      await refresh();
      addToast({
        title: 'Gradiente salvo',
        message: 'Seu cartão ganhou a nova identidade.',
        tone: 'success',
      });
    },
  });
  const clear = useMutation({ mutationFn: clearProfileGradient, onSuccess: refresh });
  const active = membership.data?.is_active === true;
  const error = save.error ?? clear.error;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Paintbrush size={16} /> Gradiente do perfil
          </p>
          <p className="mt-1 text-xs text-crypt-subtle">
            Exclusivo do Crypt Pro e aplicado ao cartão público.
          </p>
        </div>
        {!active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-200">
            <LockKeyhole size={11} /> Crypt Pro
          </span>
        ) : null}
      </div>
      <div
        className="mt-4 h-20 rounded-xl border border-white/10"
        style={{ background: `linear-gradient(${angle}deg,${start},${end})` }}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
        <label className="text-xs text-crypt-muted">
          Cor inicial
          <input
            className="mt-2 h-10 w-full"
            disabled={!active}
            onChange={(e) => setStart(e.target.value)}
            type="color"
            value={start}
          />
        </label>
        <label className="text-xs text-crypt-muted">
          Cor final
          <input
            className="mt-2 h-10 w-full"
            disabled={!active}
            onChange={(e) => setEnd(e.target.value)}
            type="color"
            value={end}
          />
        </label>
        <label className="text-xs text-crypt-muted">
          Ângulo: {angle}°
          <input
            className="mt-3 w-full accent-violet-500"
            disabled={!active}
            max="360"
            min="0"
            onChange={(e) => setAngle(Number(e.target.value))}
            type="range"
            value={angle}
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button disabled={!active} loading={save.isPending} onClick={() => save.mutate()} size="sm">
          Salvar gradiente
        </Button>
        <Button
          disabled={!active || !profile.profile_gradient_start}
          leadingIcon={<RotateCcw size={14} />}
          loading={clear.isPending}
          onClick={() => clear.mutate()}
          size="sm"
          variant="ghost"
        >
          Usar padrão
        </Button>
      </div>
      {error ? (
        <p className="mt-3 text-xs text-red-300">{toProfileActionError(error).message}</p>
      ) : null}
    </div>
  );
}
