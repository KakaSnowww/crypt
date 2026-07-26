import { z } from 'zod';
import { ServerActionError } from './servers.errors';
import type { ServerMediaKind } from './servers.types';

export const MAX_SERVER_ICON_BYTES = 2 * 1024 * 1024;
export const MAX_SERVER_BANNER_BYTES = 5 * 1024 * 1024;
export const ALLOWED_SERVER_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const noControlCharacters = /^[^\p{Cc}\p{Cf}]*$/u;

export const serverNameSchema = z
  .string()
  .trim()
  .min(2, 'Use pelo menos 2 caracteres.')
  .max(80, 'Use no máximo 80 caracteres.')
  .regex(noControlCharacters, 'Remova caracteres invisíveis do nome.');

export const createServerSchema = z.object({
  description: z
    .string()
    .trim()
    .max(500, 'Use no máximo 500 caracteres.')
    .regex(noControlCharacters, 'Remova caracteres invisíveis da descrição.'),
  name: serverNameSchema,
});

export const serverSettingsSchema = createServerSchema;

export const inviteCodeSchema = z
  .string()
  .trim()
  .transform(extractInviteCode)
  .pipe(z.string().regex(/^[a-f0-9]{36}$/, 'Cole um convite válido do Crypt.'));

export function extractInviteCode(value: string) {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    const parts = url.pathname.split('/').filter(Boolean);
    return (parts.at(-1) ?? '').toLocaleLowerCase('en-US');
  } catch {
    const withoutQuery = trimmedValue.split(/[?#]/, 1)[0] ?? '';
    return (withoutQuery.split('/').filter(Boolean).at(-1) ?? '').toLocaleLowerCase('en-US');
  }
}

export function validateServerMediaFile(file: File, kind: ServerMediaKind) {
  if (!ALLOWED_SERVER_MEDIA_TYPES.has(file.type)) {
    throw new ServerActionError('media_invalid');
  }

  const maxBytes = kind === 'icon' ? MAX_SERVER_ICON_BYTES : MAX_SERVER_BANNER_BYTES;

  if (file.size > maxBytes) {
    throw new ServerActionError(kind === 'icon' ? 'icon_too_large' : 'banner_too_large');
  }
}

export type CreateServerValues = z.infer<typeof createServerSchema>;
export type ServerSettingsValues = z.infer<typeof serverSettingsSchema>;
