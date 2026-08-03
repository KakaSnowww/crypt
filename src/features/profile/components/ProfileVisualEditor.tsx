import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Sparkles, Trash2, Upload } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '../../../components/common/Button';
import { ImagePositionEditor } from '../../../components/common/ImagePositionEditor';
import { useToast } from '../../../components/common/ToastContext';
import { classNames } from '../../../lib/classNames';
import { centeredImagePosition, type ImagePosition } from '../../../lib/imagePosition';
import { useAuth } from '../../auth/useAuth';
import { toProfileActionError } from '../profile.errors';
import { profileKeys } from '../profile.queries';
import { validateBannerFile } from '../profile.schemas';
import {
  getProfileMediaUrl,
  removeBanner,
  updateProfileRow,
  uploadBanner,
} from '../profile.service';
import type { Profile } from '../profile.types';
import { ProfileAvatar } from './ProfileAvatar';

const effects = [
  { id: 'none', label: 'Limpo', description: 'Sem animação adicional.' },
  { id: 'aurora', label: 'Aurora', description: 'Luzes roxas e azuis em movimento.' },
  { id: 'neon', label: 'Neon', description: 'Contorno luminoso no seu cartão.' },
  { id: 'pulse', label: 'Pulso', description: 'Brilho suave e ritmado.' },
  { id: 'ocean', label: 'Oceano', description: 'Azul profundo com brilho ciano.' },
  { id: 'sunset', label: 'Pôr do sol', description: 'Rosa, laranja e violeta aquecem o cartão.' },
  { id: 'emerald', label: 'Esmeralda', description: 'Verde escuro com reflexos luminosos.' },
] as const;

export function ProfileVisualEditor({ profile }: { profile: Profile }) {
  const inputId = useId();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [selectionError, setSelectionError] = useState('');
  const [bannerFile, setBannerFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [position, setPosition] = useState<ImagePosition>({
    x: profile.banner_position_x,
    y: profile.banner_position_y,
    zoom: profile.banner_zoom,
  });
  const bannerUrl = getProfileMediaUrl(profile.banner_path);
  const displayedBannerUrl = previewUrl ?? bannerUrl;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  const refresh = async () => {
    if (user) await queryClient.invalidateQueries({ queryKey: profileKeys.current(user.id) });
  };
  const bannerMutation = useMutation({
    mutationFn: async (file: File) => {
      validateBannerFile(file);
      if (user) await uploadBanner(user.id, file, profile.banner_path, position);
    },
    onSuccess: async () => {
      setBannerFile(undefined);
      setPreviewUrl(undefined);
      setPosition(centeredImagePosition);
      await refresh();
      addToast({
        message: 'O banner também será usado quando sua câmera estiver desligada na call.',
        title: 'Banner atualizado',
        tone: 'success',
      });
    },
  });
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (user && profile.banner_path) await removeBanner(user.id, profile.banner_path);
    },
    onSuccess: refresh,
  });
  const effectMutation = useMutation({
    mutationFn: async (effect: Profile['profile_effect']) => {
      if (user) await updateProfileRow(user.id, { profile_effect: effect });
    },
    onSuccess: refresh,
  });
  const error = bannerMutation.error ?? removeMutation.error ?? effectMutation.error;

  return (
    <div className="grid gap-6">
      <div
        className={classNames(
          'profile-visual-preview relative isolate min-h-48 overflow-hidden rounded-2xl border border-white/10',
          `profile-effect-${profile.profile_effect}`,
        )}
        style={
          displayedBannerUrl
            ? {
                backgroundImage: `url("${displayedBannerUrl}")`,
                backgroundPosition: `${previewUrl ? position.x : profile.banner_position_x}% ${previewUrl ? position.y : profile.banner_position_y}%`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${(previewUrl ? (position.zoom ?? 1) : profile.banner_zoom) * 100}%`,
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#090b14]/90 via-[#090b14]/25 to-transparent" />
        <div className="relative z-10 flex min-h-48 items-end gap-3 p-5">
          <ProfileAvatar
            avatarPath={profile.avatar_path}
            className="ring-4 ring-black/25"
            displayName={profile.display_name}
            positionX={profile.avatar_position_x}
            positionY={profile.avatar_position_y}
            size="md"
            zoom={profile.avatar_zoom}
          />
          <div>
            <strong className="text-white">{profile.display_name}</strong>
            <p className="text-xs text-white/70">@{profile.handle}</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Banner do perfil e da call</p>
        <p className="mt-1 text-xs leading-5 text-crypt-subtle">
          JPG, PNG, WebP ou GIF de até 5 MB. Use uma imagem horizontal.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-xs font-semibold text-white hover:bg-white/[0.11]"
            htmlFor={inputId}
          >
            <ImagePlus size={16} />
            {profile.banner_path ? 'Trocar banner' : 'Adicionar banner'}
            <input
              accept="image/gif,image/jpeg,image/png,image/webp"
              className="sr-only"
              id={inputId}
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSelectionError('');
                if (file) {
                  try {
                    validateBannerFile(file);
                    setBannerFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                    setPosition(centeredImagePosition);
                    bannerMutation.reset();
                  } catch (caught) {
                    setSelectionError(toProfileActionError(caught).message);
                  }
                }
                event.target.value = '';
              }}
              type="file"
            />
          </label>
          {bannerFile ? (
            <Button
              leadingIcon={<Upload size={15} />}
              loading={bannerMutation.isPending}
              onClick={() => bannerMutation.mutate(bannerFile)}
              size="sm"
            >
              Salvar enquadramento
            </Button>
          ) : null}
          {profile.banner_path ? (
            <Button
              leadingIcon={<Trash2 size={15} />}
              loading={removeMutation.isPending}
              onClick={() => removeMutation.mutate()}
              size="sm"
              variant="ghost"
            >
              Remover
            </Button>
          ) : null}
        </div>
        {bannerFile && previewUrl ? (
          <ImagePositionEditor
            animated={bannerFile.type === 'image/gif'}
            aspectRatio={3.2}
            imageUrl={previewUrl}
            onChange={setPosition}
            position={position}
          />
        ) : null}
      </div>
      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles size={16} /> Cor e efeito do perfil
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {effects.map((effect) => (
            <button
              aria-pressed={profile.profile_effect === effect.id}
              className={classNames(
                'rounded-2xl border p-4 text-left transition',
                profile.profile_effect === effect.id
                  ? 'border-violet-400/50 bg-violet-500/15'
                  : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.055]',
              )}
              disabled={effectMutation.isPending}
              key={effect.id}
              onClick={() => effectMutation.mutate(effect.id)}
              type="button"
            >
              <strong className="text-sm text-white">{effect.label}</strong>
              <span className="mt-1 block text-xs leading-5 text-crypt-subtle">
                {effect.description}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      {selectionError ? <p className="text-xs text-red-300">{selectionError}</p> : null}
      {error ? <p className="text-xs text-red-300">{toProfileActionError(error).message}</p> : null}
    </div>
  );
}
