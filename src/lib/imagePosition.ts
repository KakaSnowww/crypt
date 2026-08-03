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

export const centeredImagePosition: ImagePosition = { x: 50, y: 50, zoom: 1 };

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

  const zoom = Math.min(3, Math.max(1, position.zoom ?? 1));
  width /= zoom;
  height /= zoom;

  const normalizedX = Math.min(100, Math.max(0, position.x)) / 100;
  const normalizedY = Math.min(100, Math.max(0, position.y)) / 100;

  return {
    height,
    width,
    x: (sourceWidth - width) * normalizedX,
    y: (sourceHeight - height) * normalizedY,
  };
}

export async function preparePositionedImage(
  file: File,
  targetAspectRatio: number,
  position: ImagePosition,
) {
  if (file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file);
  const crop = calculateCoverCrop(bitmap.width, bitmap.height, targetAspectRatio, position);
  const maximumWidth = targetAspectRatio === 1 ? 1024 : 1920;
  const outputWidth = Math.min(maximumWidth, Math.max(1, Math.round(crop.width)));
  const outputHeight = Math.max(1, Math.round(outputWidth / targetAspectRatio));
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');

  if (!context) {
    bitmap.close();
    throw new Error('image_editor_unavailable');
  }

  context.drawImage(
    bitmap,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  bitmap.close();

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('image_export_failed'))),
      outputType,
      0.9,
    );
  });
  const extension = outputType === 'image/png' ? 'png' : 'webp';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagem';

  return new File([blob], `${baseName}-posicionada.${extension}`, {
    lastModified: Date.now(),
    type: outputType,
  });
}
