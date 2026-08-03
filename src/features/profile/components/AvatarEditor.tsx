import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '../../../components/common/Button';
import { ImagePositionEditor } from '../../../components/common/ImagePositionEditor';
import { useToast } from '../../../components/common/ToastContext';
import { centeredImagePosition, type ImagePosition } from '../../../lib/imagePosition';
import { useAuth } from '../../auth/useAuth';
import { toProfileActionError } from '../profile.errors';
import { profileKeys } from '../profile.queries';
import { validateAvatarFile } from '../profile.schemas';
import { removeAvatar, uploadAvatar } from '../profile.service';
import type { Profile } from '../profile.types';
import { ProfileAvatar } from './ProfileAvatar';

type AvatarEditorProps = {
  onBusyChange?: (isBusy: boolean) => void;
  profile: Profile;
};

export function AvatarEditor({ onBusyChange, profile }: AvatarEditorProps) {
  const inputId = useId();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [selectionError, setSelectionError] = useState<string>();
  const [position, setPosition] = useState<ImagePosition>(centeredImagePosition);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      if (!user) {
        return;
      }

      validateAvatarFile(selectedFile);
      await uploadAvatar(user.id, selectedFile, profile.avatar_path, position);
    },
    onMutate: () => {
      onBusyChange?.(true);
    },
    onSuccess: async () => {
      if (!user) {
        return;
      }

      setFile(undefined);
      setPreviewUrl(undefined);
      setPosition(centeredImagePosition);
      await queryClient.invalidateQueries({ queryKey: profileKeys.current(user.id) });
      addToast({
        message: 'A nova imagem já aparece no seu perfil.',
        title: 'Avatar atualizado',
        tone: 'success',
      });
    },
    onSettled: () => {
      onBusyChange?.(false);
    },
  });
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile.avatar_path) {
        return;
      }

      await removeAvatar(user.id, profile.avatar_path);
    },
    onSuccess: async () => {
      if (!user) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: profileKeys.current(user.id) });
      addToast({
        message: 'Voltamos a mostrar suas iniciais.',
        title: 'Avatar removido',
        tone: 'info',
      });
    },
  });
  const actionError = uploadMutation.error ?? removeMutation.error;

  return (
    <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      {previewUrl ? (
        <span className="grid size-28 overflow-hidden rounded-[2rem] bg-crypt-elevated">
          <img alt="Prévia do novo avatar" className="size-full object-cover" src={previewUrl} />
        </span>
      ) : (
        <ProfileAvatar
          avatarPath={profile.avatar_path}
          displayName={profile.display_name}
          positionX={profile.avatar_position_x}
          positionY={profile.avatar_position_y}
          size="lg"
          zoom={profile.avatar_zoom}
        />
      )}

      <div>
        <p className="text-sm font-semibold text-white">Sua imagem no Crypt</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-crypt-subtle">
          JPG, PNG, WebP ou GIF de até 2 MB. Imagens estáticas podem ser reposicionadas antes do
          envio.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-xs font-semibold text-white transition hover:bg-white/[0.11] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-crypt-focus"
            htmlFor={inputId}
          >
            <ImagePlus aria-hidden="true" size={16} />
            Escolher imagem
            <input
              accept="image/gif,image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploadMutation.isPending}
              id={inputId}
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                setSelectionError(undefined);

                if (selectedFile) {
                  try {
                    validateAvatarFile(selectedFile);
                    setFile(selectedFile);
                    setPreviewUrl(URL.createObjectURL(selectedFile));
                    setPosition(centeredImagePosition);
                    uploadMutation.reset();
                  } catch (error) {
                    setFile(undefined);
                    setPreviewUrl(undefined);
                    setSelectionError(toProfileActionError(error).message);
                  }
                }

                event.target.value = '';
              }}
              type="file"
            />
          </label>
          {file && !uploadMutation.isPending ? (
            <Button
              leadingIcon={<Upload aria-hidden="true" size={16} />}
              onClick={() => uploadMutation.mutate(file)}
              size="sm"
            >
              Salvar enquadramento
            </Button>
          ) : null}
          {uploadMutation.isPending ? (
            <span
              aria-live="polite"
              className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-semibold text-violet-200"
            >
              <Upload aria-hidden="true" className="animate-pulse" size={16} />
              Enviando avatar…
            </span>
          ) : null}
          {profile.avatar_path && !file ? (
            <Button
              leadingIcon={<Trash2 aria-hidden="true" size={16} />}
              loading={removeMutation.isPending}
              onClick={() => void removeMutation.mutateAsync().catch(() => undefined)}
              size="sm"
              variant="ghost"
            >
              Remover
            </Button>
          ) : null}
        </div>
        {file && previewUrl ? (
          <ImagePositionEditor
            animated={file.type === 'image/gif'}
            aspectRatio={1}
            imageUrl={previewUrl}
            onChange={setPosition}
            position={position}
          />
        ) : null}
        {selectionError ? <p className="mt-3 text-xs text-red-300">{selectionError}</p> : null}
        {actionError ? (
          <p className="mt-3 text-xs text-red-300">{toProfileActionError(actionError).message}</p>
        ) : null}
      </div>
    </div>
  );
}
