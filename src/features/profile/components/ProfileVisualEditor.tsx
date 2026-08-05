import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Crop, ImagePlus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useId, useState, type DragEvent } from 'react';
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
  {
    description: 'Sem animação adicional.',
    id: 'none',
    label: 'Limpo',
  },
  {
    description: 'Luzes roxas e azuis em movimento.',
    id: 'aurora',
    label: 'Aurora',
  },
  {
    description: 'Contorno luminoso no seu cartão.',
    id: 'neon',
    label: 'Neon',
  },
  {
    description: 'Brilho suave e ritmado.',
    id: 'pulse',
    label: 'Pulso',
  },
  {
    description: 'Azul profundo com brilho ciano.',
    id: 'ocean',
    label: 'Oceano',
  },
  {
    description: 'Rosa, laranja e violeta aquecem o cartão.',
    id: 'sunset',
    label: 'Pôr do sol',
  },
  {
    description: 'Verde escuro com reflexos luminosos.',
    id: 'emerald',
    label: 'Esmeralda',
  },
] as const;

export function ProfileVisualEditor({ profile }: { profile: Profile }) {
  const inputId = useId();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [selectionError, setSelectionError] = useState('');
  const [bannerFile, setBannerFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState<ImagePosition>({
    x: profile.banner_position_x,
    y: profile.banner_position_y,
    zoom: profile.banner_zoom,
  });
  const bannerUrl = getProfileMediaUrl(profile.banner_path);
  const displayedBannerUrl = previewUrl ?? bannerUrl;
  const displayedPosition = editing
    ? position
    : {
        x: profile.banner_position_x,
        y: profile.banner_position_y,
        zoom: profile.banner_zoom,
      };

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  async function refresh() {
    if (user) {
      await queryClient.invalidateQueries({
        queryKey: profileKeys.current(user.id),
      });
    }
  }

  function clearPreviewUrl() {
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return undefined;
    });
  }

  function cancelEditing() {
    clearPreviewUrl();
    setBannerFile(undefined);
    setEditing(false);
    setSelectionError('');
    setPosition({
      x: profile.banner_position_x,
      y: profile.banner_position_y,
      zoom: profile.banner_zoom,
    });
  }

  function selectBanner(file: File) {
    try {
      validateBannerFile(file);
      clearPreviewUrl();
      setBannerFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPosition(centeredImagePosition);
      setEditing(true);
      setSelectionError('');
      bannerMutation.reset();
    } catch (caught) {
      setSelectionError(toProfileActionError(caught).message);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files[0];

    if (file) {
      selectBanner(file);
    }
  }

  const bannerMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      if (bannerFile) {
        await uploadBanner(user.id, bannerFile, profile.banner_path, position);
      } else {
        await updateProfileRow(user.id, {
          banner_position_x: position.x,
          banner_position_y: position.y,
          banner_zoom: position.zoom ?? 1,
        });
      }
    },
    onSuccess: async () => {
      clearPreviewUrl();
      setBannerFile(undefined);
      setEditing(false);
      await refresh();
      addToast({
        message: bannerFile
          ? 'A imagem e o enquadramento já aparecem no perfil e nas chamadas.'
          : 'O enquadramento atual foi salvo sem reenviar o banner.',
        title: 'Banner atualizado',
        tone: 'success',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (user && profile.banner_path) {
        await removeBanner(user.id, profile.banner_path);
      }
    },
    onSuccess: async () => {
      cancelEditing();
      await refresh();
      addToast({
        message: 'O perfil voltou a usar o fundo padrão ou seu gradiente.',
        title: 'Banner removido',
        tone: 'info',
      });
    },
  });

  const effectMutation = useMutation({
    mutationFn: async (effect: Profile['profile_effect']) => {
      if (user) {
        await updateProfileRow(user.id, {
          profile_effect: effect,
        });
      }
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
                backgroundPosition: `${displayedPosition.x}% ` + `${displayedPosition.y}%`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${(displayedPosition.zoom ?? 1) * 100}%`,
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

        {editing ? (
          <span className="absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[0.62rem] font-semibold text-white backdrop-blur-md">
            Prévia não salva
          </span>
        ) : null}
      </div>

      <div
        className={`crypt-image-drop-zone p-4 ${dragging ? 'is-dragging' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setDragging(false);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <p className="text-sm font-semibold text-white">Banner do perfil e da chamada</p>
        <p className="mt-1 text-xs leading-5 text-crypt-subtle">
          Arraste uma imagem horizontal para esta área ou escolha JPG, PNG, WebP ou GIF de até 5 MB.
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

                if (file) {
                  selectBanner(file);
                }

                event.target.value = '';
              }}
              type="file"
            />
          </label>

          {profile.banner_path && !editing ? (
            <Button
              leadingIcon={<Crop size={15} />}
              onClick={() => {
                setBannerFile(undefined);
                clearPreviewUrl();
                setPosition({
                  x: profile.banner_position_x,
                  y: profile.banner_position_y,
                  zoom: profile.banner_zoom,
                });
                setEditing(true);
              }}
              size="sm"
              variant="secondary"
            >
              Reenquadrar atual
            </Button>
          ) : null}

          {editing && displayedBannerUrl ? (
            <>
              <Button
                leadingIcon={<Save size={15} />}
                loading={bannerMutation.isPending}
                onClick={() => bannerMutation.mutate()}
                size="sm"
              >
                Salvar enquadramento
              </Button>
              <Button
                leadingIcon={<X size={15} />}
                onClick={cancelEditing}
                size="sm"
                variant="ghost"
              >
                Cancelar
              </Button>
            </>
          ) : null}

          {profile.banner_path && !bannerFile ? (
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

        {editing && displayedBannerUrl ? (
          <ImagePositionEditor
            animated={bannerFile?.type === 'image/gif'}
            aspectRatio={3.2}
            imageUrl={displayedBannerUrl}
            onChange={setPosition}
            position={position}
            shape="rounded"
          />
        ) : null}

        {dragging ? (
          <p className="mt-3 text-xs font-semibold text-violet-200">
            Solte a imagem para abrir o editor.
          </p>
        ) : null}
      </div>

      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles size={16} />
          Cor e efeito do perfil
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
