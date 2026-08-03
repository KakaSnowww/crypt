import type { ImagePosition } from '../../lib/imagePosition';
import { Move, RotateCcw, ZoomIn } from 'lucide-react';
import { useRef } from 'react';

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
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    { pointerId: number; x: number; y: number; startX: number; startY: number } | undefined
  >(undefined);
  return (
    <div className="mt-4 rounded-2xl border border-violet-400/20 bg-black/20 p-3">
      <div
        className="relative mx-auto w-full max-w-md touch-none cursor-grab overflow-hidden rounded-xl bg-crypt-elevated active:cursor-grabbing"
        onPointerDown={(event) => {
          dragRef.current = {
            pointerId: event.pointerId,
            startX: position.x,
            startY: position.y,
            x: event.clientX,
            y: event.clientY,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const preview = previewRef.current;
          if (!drag || !preview || drag.pointerId !== event.pointerId) return;
          const bounds = preview.getBoundingClientRect();
          onChange({
            ...position,
            x: Math.max(
              0,
              Math.min(100, drag.startX + ((event.clientX - drag.x) / bounds.width) * 100),
            ),
            y: Math.max(
              0,
              Math.min(100, drag.startY + ((event.clientY - drag.y) / bounds.height) * 100),
            ),
          });
        }}
        onPointerUp={() => {
          dragRef.current = undefined;
        }}
        ref={previewRef}
        style={{ aspectRatio }}
      >
        <img
          alt="Prévia do enquadramento"
          className="pointer-events-none size-full select-none object-cover"
          draggable={false}
          src={imageUrl}
          style={{
            objectPosition: `${position.x}% ${position.y}%`,
            transform: `scale(${position.zoom ?? 1})`,
          }}
        />
        <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">
          <Move size={12} /> Arraste para enquadrar
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
        <label className="text-xs font-medium text-crypt-muted">
          <span className="flex items-center gap-1">
            <ZoomIn size={13} /> Zoom
          </span>
          <input
            aria-label="Zoom da imagem"
            className="mt-2 w-full accent-violet-500"
            max="3"
            min="1"
            onChange={(event) => onChange({ ...position, zoom: Number(event.target.value) })}
            step="0.05"
            type="range"
            value={position.zoom ?? 1}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-crypt-subtle">
          {animated
            ? 'O GIF será preservado com animação e com este enquadramento.'
            : 'O arquivo original será preservado.'}
        </p>
        <button
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200"
          onClick={() => onChange({ x: 50, y: 50, zoom: 1 })}
          type="button"
        >
          <RotateCcw size={13} /> Redefinir
        </button>
      </div>
    </div>
  );
}
