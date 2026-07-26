import { z } from 'zod';

const visibleText = /^[^\p{Cc}\p{Cf}]*$/u;

export const categorySchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome da categoria.')
  .max(80, 'Use no máximo 80 caracteres.')
  .regex(visibleText, 'Remova caracteres invisíveis.');

export const channelSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  icon: z.string().trim().max(16, 'Use um emoji ou ícone curto.'),
  isReadOnly: z.boolean(),
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do canal.')
    .max(80, 'Use no máximo 80 caracteres.')
    .regex(visibleText, 'Remova caracteres invisíveis.'),
  slowmodeSeconds: z.number().int().min(0).max(21_600),
  topic: z.string().trim().max(1024, 'Use no máximo 1.024 caracteres.'),
});

export const roleSchema = z.object({
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Escolha uma cor hexadecimal válida.'),
  displaySeparately: z.boolean(),
  name: z.string().trim().min(1).max(64).regex(visibleText),
  permissions: z.number().int().min(0).max(131_071),
});
