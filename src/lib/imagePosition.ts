export type ImagePosition = {
  x: number;
  y: number;
  zoom?: number;
};

export type CropRectangle = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export const centeredImagePosition: ImagePosition = {
  x: 50,
  y: 50,
  zoom: 1,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeImagePosition(position: ImagePosition): Required<ImagePosition> {
  return {
    x: clamp(Number.isFinite(position.x) ? position.x : 50, 0, 100),
    y: clamp(Number.isFinite(position.y) ? position.y : 50, 0, 100),
    zoom: clamp(Number.isFinite(position.zoom) ? (position.zoom ?? 1) : 1, 1, 3),
  };
}

export function moveImagePosition(position: ImagePosition, deltaX: number, deltaY: number) {
  const normalized = normalizeImagePosition(position);

  return normalizeImagePosition({
    ...normalized,
    x: normalized.x + deltaX,
    y: normalized.y + deltaY,
  });
}

export function zoomImagePosition(position: ImagePosition, delta: number) {
  const normalized = normalizeImagePosition(position);

  return normalizeImagePosition({
    ...normalized,
    zoom: normalized.zoom + delta,
  });
}

export function calculateCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetAspectRatio: number,
  position: ImagePosition,
): CropRectangle {
  const sourceAspectRatio = sourceWidth / sourceHeight;
  let width = sourceWidth;
  let height = sourceHeight;

  if (sourceAspectRatio > targetAspectRatio) {
    width = sourceHeight * targetAspectRatio;
  } else {
    height = sourceWidth / targetAspectRatio;
  }

  const normalized = normalizeImagePosition(position);
  width /= normalized.zoom;
  height /= normalized.zoom;

  return {
    height,
    width,
    x: (sourceWidth - width) * (normalized.x / 100),
    y: (sourceHeight - height) * (normalized.y / 100),
  };
}

async function loadImageSource(file: File) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);

    return {
      close: () => bitmap.close(),
      height: bitmap.height,
      source: bitmap as CanvasImageSource,
      width: bitmap.width,
    };
  }

  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('image_editor_unavailable'));
      element.src = url;
    });

    return {
      close: () => undefined,
      height: image.naturalHeight,
      source: image as CanvasImageSource,
      width: image.naturalWidth,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function preparePositionedImage(
  file: File,
  targetAspectRatio: number,
  position: ImagePosition,
) {
  if (file.type === 'image/gif') {
    return file;
  }

  const image = await loadImageSource(file);

  try {
    const crop = calculateCoverCrop(image.width, image.height, targetAspectRatio, position);
    const maximumWidth = targetAspectRatio === 1 ? 1024 : 1920;
    const outputWidth = Math.min(maximumWidth, Math.max(1, Math.round(crop.width)));
    const outputHeight = Math.max(1, Math.round(outputWidth / targetAspectRatio));
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext('2d', {
      alpha: file.type === 'image/png',
    });

    if (!context) {
      throw new Error('image_editor_unavailable');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image.source,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('image_export_failed'))),
        outputType,
        0.92,
      );
    });
    const extension = outputType === 'image/png' ? 'png' : 'webp';
    const baseName = file.name.replace(/\.[^.]+$/u, '') || 'imagem';

    return new File([blob], `${baseName}-enquadrada.${extension}`, {
      lastModified: Date.now(),
      type: outputType,
    });
  } finally {
    image.close();
  }
}
