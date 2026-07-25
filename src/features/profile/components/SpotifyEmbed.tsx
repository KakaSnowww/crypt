import { Music2 } from 'lucide-react';
import { parseSpotifyTrackUrl } from '../profile.schemas';

type SpotifyEmbedProps = {
  title: null | string;
  url: null | string;
};

export function SpotifyEmbed({ title, url }: SpotifyEmbedProps) {
  const track = url ? parseSpotifyTrackUrl(url) : null;

  if (!track) {
    return (
      <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-5 text-center">
        <div>
          <Music2 aria-hidden="true" className="mx-auto text-crypt-subtle" size={24} />
          <p className="mt-3 text-sm font-medium text-crypt-muted">
            Música favorita não configurada
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      className="h-[152px] w-full rounded-2xl border-0"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      src={`https://open.spotify.com/embed/track/${track.trackId}?utm_source=generator&theme=0`}
      title={`Spotify Embed: ${title ?? 'música favorita'}`}
    />
  );
}
