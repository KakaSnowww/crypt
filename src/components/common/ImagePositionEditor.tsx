import type { ImagePosition } from '../../lib/imagePosition';

export function ImagePositionEditor({
  animated,
  aspectRatio,
  imageUrl,
  onChange,
  position,
}: {
  animated: boolean;
  aspectRatio: number;
  imageUrl: string;
  onChange: (position: ImagePosition) => void;
  position: ImagePosition;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-violet-400/20 bg-black/20 p-3">
      <div
        className="mx-auto w-full max-w-md overflow-hidden rounded-xl bg-crypt-elevated"
        style={{ aspectRatio }}
      >
        <img
          alt="Prévia do enquadramento"
          className="size-full object-cover"
          src={imageUrl}
          style={{ objectPosition: `${position.x}% ${position.y}%` }}
        />
      </div>
      {animated ? (
        <p className="mt-3 text-xs leading-5 text-crypt-subtle">
          O GIF será preservado com animação e centralizado. O recorte manual vale para JPG, PNG e
          WebP.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-crypt-muted">
            Horizontal
            <input
              aria-label="Posição horizontal"
              className="mt-2 w-full accent-violet-500"
              max="100"
              min="0"
              onChange={(event) => onChange({ ...position, x: Number(event.target.value) })}
              type="range"
              value={position.x}
            />
          </label>
          <label className="text-xs font-medium text-crypt-muted">
            Vertical
            <input
              aria-label="Posição vertical"
              className="mt-2 w-full accent-violet-500"
              max="100"
              min="0"
              onChange={(event) => onChange({ ...position, y: Number(event.target.value) })}
              type="range"
              value={position.y}
            />
          </label>
        </div>
      )}
    </div>
  );
}
