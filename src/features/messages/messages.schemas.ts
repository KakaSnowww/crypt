import { z } from 'zod';

export const MAX_MESSAGE_LENGTH = 2_000;
export const MAX_MESSAGE_ATTACHMENTS = 3;
export const MAX_MESSAGE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MESSAGE_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);

export const messageSchema = z
  .string()
  .trim()
  .max(MAX_MESSAGE_LENGTH, 'Use no máximo 2.000 caracteres.');

export function validateMessagePayload(content: string, files: File[]) {
  const parsedContent = messageSchema.parse(content);

  if (!parsedContent && files.length === 0) {
    throw new Error('Escreva uma mensagem ou escolha um arquivo.');
  }

  if (files.length > MAX_MESSAGE_ATTACHMENTS) {
    throw new Error('Envie no máximo 3 arquivos por mensagem.');
  }

  for (const file of files) {
    if (!ALLOWED_MESSAGE_ATTACHMENT_TYPES.has(file.type)) {
      throw new Error('Use imagens, GIF, PDF ou arquivo de texto.');
    }

    if (file.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
      throw new Error('Cada arquivo deve possuir no máximo 5 MB.');
    }
  }

  return parsedContent;
}
