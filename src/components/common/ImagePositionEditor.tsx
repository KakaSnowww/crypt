import { Grid3X3, Maximize2, Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import {
  centeredImagePosition,
  moveImagePosition,
  normalizeImagePosition,
  type ImagePosition,
  zoomImagePosition,
} from '../../lib/imagePosition';
import './image-position-editor.css';

type FocusPreset = 'bottom' | 'center' | 'left' | 'right' | 'top';

const presetPositions: Record<FocusPreset, Pick<ImagePosition, 'x' | 'y'>> = {
  bottom: {
    x: 50,
    y: 100,
  },
  center: {
    x: 50,
    y: 50,
  },
  left: {
    x: 0,
    y: 50,
  },
  right: {
    x: 100,
    y: 50,
  },
  top: {
    x: 50,
    y: 0,
  },
};

export function ImagePositionEditor({
  animated,
  aspectRatio,
  imageUrl,
  onChange,
  position,
  shape,
}: {
  animated: boolean;
  aspectRatio: number;
  imageUrl: string;
  onChange: (position: ImagePosition) => void;
  position: ImagePosition;
  shape?: 'circle' | 'rounded';
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | {
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startPosition: Required<ImagePosition>;
      }
    | undefined
  >(undefined);
  const [gridVisible, setGridVisible] = useState(true);
  const normalized = normalizeImagePosition(position);
  const visualShape = shape ?? (aspectRatio === 1 ? 'circle' : 'rounded');

  function update(next: ImagePosition) {
    onChange(normalizeImagePosition(next));
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: normalized,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continueDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const preview = previewRef.current;

    if (!drag || !preview || drag.pointerId !== event.pointerId) {
      return;
    }

    const bounds = preview.getBoundingClientRect();
    const sensitivity = 100 / Math.max(1, drag.startPosition.zoom);

    update({
      ...drag.startPosition,
      x:
        drag.startPosition.x -
        ((event.clientX - drag.startClientX) / Math.max(1, bounds.width)) * sensitivity,
      y:
        drag.startPosition.y -
        ((event.clientY - drag.startClientY) / Math.max(1, bounds.height)) * sensitivity,
    });
  }

  function endDrag() {
    dragRef.current = undefined;
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    update(zoomImagePosition(normalized, event.deltaY < 0 ? 0.08 : -0.08));
  }

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const amount = event.shiftKey ? 5 : 1;
    const key = event.key.toLocaleLowerCase('en-US');

    if (key === 'arrowleft') {
      event.preventDefault();
      update(moveImagePosition(normalized, -amount, 0));
    } else if (key === 'arrowright') {
      event.preventDefault();
      update(moveImagePosition(normalized, amount, 0));
    } else if (key === 'arrowup') {
      event.preventDefault();
      update(moveImagePosition(normalized, 0, -amount));
    } else if (key === 'arrowdown') {
      event.preventDefault();
      update(moveImagePosition(normalized, 0, amount));
    } else if (key === '+' || key === '=') {
      event.preventDefault();
      update(zoomImagePosition(normalized, 0.05));
    } else if (key === '-') {
      event.preventDefault();
      update(zoomImagePosition(normalized, -0.05));
    } else if (key === 'r') {
      event.preventDefault();
      update(centeredImagePosition);
    }
  }

  function applyPreset(preset: FocusPreset) {
    update({
      ...normalized,
      ...presetPositions[preset],
    });
  }

  return (
    <div className="crypt-image-editor mt-4">
      <div
        aria-label="Editor de enquadramento. Arraste a imagem, use a roda para ampliar ou as setas para ajustar."
        className={`crypt-image-editor__stage ${visualShape === 'circle' ? 'is-circle' : ''}`}
        onKeyDown={handleKeyboard}
        onLostPointerCapture={endDrag}
        onPointerCancel={endDrag}
        onPointerDown={beginDrag}
        onPointerMove={continueDrag}
        onPointerUp={endDrag}
        onWheel={handleWheel}
        ref={previewRef}
        role="application"
        style={{ aspectRatio }}
        tabIndex={0}
      >
        <img
          alt="Prévia do enquadramento"
          className="crypt-image-editor__image"
          draggable={false}
          src={imageUrl}
          style={{
            objectPosition: `${normalized.x}% ` + `${normalized.y}%`,
            transform: `scale(${normalized.zoom})`,
          }}
        />
        <span className="crypt-image-editor__shade" />
        {gridVisible ? <span className="crypt-image-editor__grid" /> : null}
        <span className="crypt-image-editor__hint">
          <Move aria-hidden="true" size={12} />
          Arraste · roda aplica zoom
        </span>
      </div>

      <div className="crypt-image-editor__toolbar">
        {(
          [
            ['left', 'Esquerda'],
            ['center', 'Centro'],
            ['right', 'Direita'],
            ['top', 'Topo'],
            ['bottom', 'Base'],
          ] as const
        ).map(([preset, label]) => (
          <button
            className="crypt-image-editor__tool"
            key={preset}
            onClick={() => applyPreset(preset)}
            type="button"
          >
            {label}
          </button>
        ))}

        <button
          aria-pressed={gridVisible}
          className={`crypt-image-editor__tool ${gridVisible ? 'is-active' : ''}`}
          onClick={() => setGridVisible((current) => !current)}
          type="button"
        >
          <Grid3X3 size={13} />
          Grade
        </button>

        <span className="crypt-image-editor__values">
          X {Math.round(normalized.x)} · Y {Math.round(normalized.y)} · Zoom{' '}
          {Math.round(normalized.zoom * 100)}%
        </span>
      </div>

      <div className="crypt-image-editor__controls">
        <label className="crypt-image-editor__control">
          <span>
            <Move size={13} />
            Horizontal
          </span>
          <input
            aria-label="Posição horizontal"
            max={100}
            min={0}
            onChange={(event) =>
              update({
                ...normalized,
                x: Number(event.target.value),
              })
            }
            type="range"
            value={normalized.x}
          />
          <output>{Math.round(normalized.x)}%</output>
        </label>

        <label className="crypt-image-editor__control">
          <span>
            <Maximize2 size={13} />
            Vertical
          </span>
          <input
            aria-label="Posição vertical"
            max={100}
            min={0}
            onChange={(event) =>
              update({
                ...normalized,
                y: Number(event.target.value),
              })
            }
            type="range"
            value={normalized.y}
          />
          <output>{Math.round(normalized.y)}%</output>
        </label>

        <label className="crypt-image-editor__control">
          <span>
            <ZoomIn size={13} />
            Zoom
          </span>
          <input
            aria-label="Zoom da imagem"
            max={3}
            min={1}
            onChange={(event) =>
              update({
                ...normalized,
                zoom: Number(event.target.value),
              })
            }
            step={0.01}
            type="range"
            value={normalized.zoom}
          />
          <output>{Math.round(normalized.zoom * 100)}%</output>
        </label>
      </div>

      <div className="crypt-image-editor__footer">
        <span>
          Setas ajustam 1%. Shift + seta ajusta 5%. + e − alteram o zoom.
          {animated
            ? ' A animação do GIF será preservada.'
            : ' O recorte usa suavização de alta qualidade.'}
        </span>

        <div className="flex gap-2">
          <button
            className="crypt-image-editor__tool"
            onClick={() => update(zoomImagePosition(normalized, -0.1))}
            type="button"
          >
            <ZoomOut size={13} />
          </button>
          <button
            className="crypt-image-editor__tool"
            onClick={() => update(zoomImagePosition(normalized, 0.1))}
            type="button"
          >
            <ZoomIn size={13} />
          </button>
          <button
            className="crypt-image-editor__tool"
            onClick={() => update(centeredImagePosition)}
            type="button"
          >
            <RotateCcw size={13} />
            Redefinir
          </button>
        </div>
      </div>
    </div>
  );
}
