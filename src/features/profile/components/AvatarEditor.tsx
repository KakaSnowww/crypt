import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Crop, ImagePlus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useId, useState, type DragEvent } from 'react';
import { Button } from '../../../components/common/Button';
import { ImagePositionEditor } from '../../../components/common/ImagePositionEditor';
import { useToast } from '../../../components/common/ToastContext';
import { centeredImagePosition, type ImagePosition } from '../../../lib/imagePosition';
import { useAuth } from '../../auth/useAuth';
import { toProfileActionError } from '../profile.errors';
import { profileKeys } from '../profile.queries';
import { validateAvatarFile } from '../profile.schemas';
import {
  getProfileMediaUrl,
  removeAvatar,
  updateProfileRow,
  uploadAvatar,
} from '../profile.service';
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
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectionError, setSelectionError] = useState<string>();
  const [position, setPosition] = useState<ImagePosition>({
    x: profile.avatar_position_x,
    y: profile.avatar_position_y,
    zoom: profile.avatar_zoom,
  });
  const currentUrl = getProfileMediaUrl(profile.avatar_path);
  const editorUrl = previewUrl ?? currentUrl;

  useEffect(() => {
    if (!editing) {
      setPosition({
        x: profile.avatar_position_x,
        y: profile.avatar_position_y,
        zoom: profile.avatar_zoom,
      });
    }
  }, [editing, profile.avatar_position_x, profile.avatar_position_y, profile.avatar_zoom]);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  async function refresh() {
    if (!user) return;

    await queryClient.invalidateQueries({
      queryKey: profileKeys.current(user.id),
    });
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
    setFile(undefined);
    setEditing(false);
    setSelectionError(undefined);
    setPosition({
      x: profile.avatar_position_x,
      y: profile.avatar_position_y,
      zoom: profile.avatar_zoom,
    });
  }

  function selectFile(selectedFile: File) {
    try {
      validateAvatarFile(selectedFile);
      clearPreviewUrl();
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setPosition(centeredImagePosition);
      setEditing(true);
      setSelectionError(undefined);
      saveMutation.reset();
    } catch (error) {
      setSelectionError(toProfileActionError(error).message);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const selectedFile = event.dataTransfer.files[0];

    if (selectedFile) {
      selectFile(selectedFile);
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      if (file) {
        await uploadAvatar(user.id, file, profile.avatar_path, position);
      } else {
        await updateProfileRow(user.id, {
          avatar_position_x: position.x,
          avatar_position_y: position.y,
          avatar_zoom: position.zoom ?? 1,
        });
      }
    },
    onMutate: () => onBusyChange?.(true),
    onSuccess: async () => {
      clearPreviewUrl();
      setFile(undefined);
      setEditing(false);
      await refresh();
      addToast({
        message: file
          ? 'A nova imagem e o enquadramento já aparecem em todo o Crypt.'
          : 'O novo enquadramento foi salvo sem reenviar a imagem.',
        title: 'Avatar atualizado',
        tone: 'success',
      });
    },
    onSettled: () => onBusyChange?.(false),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile.avatar_path) {
        return;
      }

      await removeAvatar(user.id, profile.avatar_path);
    },
    onSuccess: async () => {
      cancelEditing();
      await refresh();
      addToast({
        message: 'Voltamos a mostrar suas iniciais.',
        title: 'Avatar removido',
        tone: 'info',
      });
    },
  });

  const actionError = saveMutation.error ?? removeMutation.error;

  return (
    <div
      className={`crypt-image-drop-zone grid gap-5 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start ${
        dragging ? 'is-dragging' : ''
      }`}
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
      <div className="grid justify-items-center gap-2">
        {previewUrl ? (
          <span className="grid size-28 overflow-hidden rounded-[2rem] bg-crypt-elevated">
            <img
              alt="Prévia do novo avatar"
              className="size-full object-cover"
              src={previewUrl}
              style={{
                objectPosition: `${position.x}% ${position.y}%`,
                transform: `scale(${position.zoom ?? 1})`,
              }}
            />
          </span>
        ) : (
          <ProfileAvatar
            avatarPath={profile.avatar_path}
            displayName={profile.display_name}
            positionX={editing ? position.x : profile.avatar_position_x}
            positionY={editing ? position.y : profile.avatar_position_y}
            size="lg"
            zoom={editing ? position.zoom : profile.avatar_zoom}
          />
        )}

        {editing ? (
          <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[0.62rem] font-semibold text-violet-200">
            Prévia não salva
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">Sua imagem no Crypt</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-crypt-subtle">
          Arraste um arquivo para esta área ou escolha JPG, PNG, WebP ou GIF de até 2 MB.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <label
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-xs font-semibold text-white transition hover:bg-white/[0.11] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-crypt-focus"
            htmlFor={inputId}
          >
            <ImagePlus aria-hidden="true" size={16} />
            {profile.avatar_path ? 'Trocar imagem' : 'Escolher imagem'}
            <input
              accept="image/gif,image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={saveMutation.isPending}
              id={inputId}
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];

                if (selectedFile) {
                  selectFile(selectedFile);
                }

                event.target.value = '';
              }}
              type="file"
            />
          </label>

          {profile.avatar_path && !editing ? (
            <Button
              leadingIcon={<Crop aria-hidden="true" size={16} />}
              onClick={() => {
                setFile(undefined);
                clearPreviewUrl();
                setPosition({
                  x: profile.avatar_position_x,
                  y: profile.avatar_position_y,
                  zoom: profile.avatar_zoom,
                });
                setEditing(true);
              }}
              size="sm"
              variant="secondary"
            >
              Reenquadrar atual
            </Button>
          ) : null}

          {editing && editorUrl ? (
            <>
              <Button
                leadingIcon={<Save aria-hidden="true" size={16} />}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                size="sm"
              >
                Salvar enquadramento
              </Button>
              <Button
                leadingIcon={<X aria-hidden="true" size={16} />}
                onClick={cancelEditing}
                size="sm"
                variant="ghost"
              >
                Cancelar
              </Button>
            </>
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

        {editing && editorUrl ? (
          <ImagePositionEditor
            animated={file?.type === 'image/gif'}
            aspectRatio={1}
            imageUrl={editorUrl}
            onChange={setPosition}
            position={position}
            shape="circle"
          />
        ) : null}

        {dragging ? (
          <p className="mt-3 text-xs font-semibold text-violet-200">
            Solte a imagem para abrir o editor.
          </p>
        ) : null}

        {selectionError ? <p className="mt-3 text-xs text-red-300">{selectionError}</p> : null}

        {actionError ? (
          <p className="mt-3 text-xs text-red-300">{toProfileActionError(actionError).message}</p>
        ) : null}
      </div>
    </div>
  );
}
