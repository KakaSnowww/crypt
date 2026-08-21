import { z } from 'zod';

export const MAX_MESSAGE_LENGTH = 2_000;
export const MAX_MESSAGE_ATTACHMENTS = 3;
export const MAX_MESSAGE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_PRO_MESSAGE_ATTACHMENT_BYTES = 500 * 1024 * 1024;
const messageAttachmentTypes = [
  'application/json',
  'application/octet-stream',
  'application/pdf',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/x-zip-compressed',
  'application/zip',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/markdown',
  'text/plain',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export const ALLOWED_MESSAGE_ATTACHMENT_TYPES = new Set<string>(messageAttachmentTypes);
export const MESSAGE_ATTACHMENT_ACCEPT = messageAttachmentTypes.join(',');

export const messageSchema = z
  .string()
  .trim()
  .max(MAX_MESSAGE_LENGTH, 'Use no máximo 2.000 caracteres.');

export function validateMessagePayload(
  content: string,
  files: File[],
  maximumAttachmentBytes = MAX_MESSAGE_ATTACHMENT_BYTES,
) {
  const parsedContent = messageSchema.parse(content);

  if (!parsedContent && files.length === 0) {
    throw new Error('Escreva uma mensagem ou escolha um arquivo.');
  }

  if (files.length > MAX_MESSAGE_ATTACHMENTS) {
    throw new Error('Envie no máximo 3 arquivos por mensagem.');
  }

  for (const file of files) {
    if (!ALLOWED_MESSAGE_ATTACHMENT_TYPES.has(file.type)) {
      throw new Error('Este formato de arquivo não é aceito pelo Crypt.');
    }

    if (file.size > maximumAttachmentBytes) {
      throw new Error(
        `Cada arquivo deve possuir no máximo ${Math.round(maximumAttachmentBytes / 1024 / 1024)} MB.`,
      );
    }
  }

  return parsedContent;
}
