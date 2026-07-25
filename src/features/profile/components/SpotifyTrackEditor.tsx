import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Music2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { useToast } from '../../../components/common/ToastContext';
import { useAuth } from '../../auth/useAuth';
import { toProfileActionError } from '../profile.errors';
import { profileKeys } from '../profile.queries';
import { spotifyTrackSchema } from '../profile.schemas';
import { removeFavoriteSpotifyTrack, saveFavoriteSpotifyTrack } from '../profile.service';
import type { Profile } from '../profile.types';
import { SpotifyEmbed } from './SpotifyEmbed';

type SpotifyTrackEditorProps = {
  onSaved?: () => void;
  profile: Profile;
};

export function SpotifyTrackEditor({ onSaved, profile }: SpotifyTrackEditorProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [url, setUrl] = useState(profile.favorite_spotify_url ?? '');
  const [validationError, setValidationError] = useState<string>();

  const saveMutation = useMutation({
    mutationFn: async (validatedUrl: string) => {
      if (!user) {
        return;
      }

      await saveFavoriteSpotifyTrack(user.id, validatedUrl);
    },
    onSuccess: async () => {
      if (!user) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: profileKeys.current(user.id) });
      addToast({
        message: 'O player oficial já está disponível no seu perfil.',
        title: 'Música favorita salva',
        tone: 'success',
      });
      onSaved?.();
    },
  });
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (user) {
        await removeFavoriteSpotifyTrack(user.id);
      }
    },
    onSuccess: async () => {
      if (!user) {
        return;
      }

      setUrl('');
      await queryClient.invalidateQueries({ queryKey: profileKeys.current(user.id) });
      addToast({
        message: 'Você pode escolher outra faixa quando quiser.',
        title: 'Música removida',
        tone: 'info',
      });
    },
  });
  const actionError = saveMutation.error ?? removeMutation.error;

  function handleSave() {
    const result = spotifyTrackSchema.safeParse({ url });

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message);
      return;
    }

    setValidationError(undefined);
    void saveMutation.mutateAsync(result.data.url).catch(() => undefined);
  }

  return (
    <div className="grid gap-5">
      <Input
        autoCapitalize="none"
        errorText={validationError}
        helperText="No Spotify, use Compartilhar → Copiar link da música. Somente links de faixas são aceitos."
        label="Link da faixa no Spotify"
        leadingIcon={<Music2 aria-hidden="true" size={17} />}
        onChange={(event) => {
          setUrl(event.target.value);
          setValidationError(undefined);
        }}
        placeholder="https://open.spotify.com/track/..."
        spellCheck={false}
        type="url"
        value={url}
      />
      {actionError ? (
        <p className="text-xs leading-5 text-red-300">
          {toProfileActionError(actionError).message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          leadingIcon={<ExternalLink aria-hidden="true" size={16} />}
          loading={saveMutation.isPending}
          onClick={handleSave}
        >
          Validar e salvar
        </Button>
        {profile.favorite_spotify_url ? (
          <Button
            leadingIcon={<Trash2 aria-hidden="true" size={16} />}
            loading={removeMutation.isPending}
            onClick={() => void removeMutation.mutateAsync().catch(() => undefined)}
            variant="ghost"
          >
            Remover música
          </Button>
        ) : null}
      </div>
      <SpotifyEmbed title={profile.favorite_spotify_title} url={profile.favorite_spotify_url} />
      <p className="text-xs leading-5 text-crypt-subtle">
        O áudio é reproduzido pelo player oficial do Spotify. O Crypt não baixa nem hospeda a faixa.
      </p>
    </div>
  );
}
