import { z } from 'zod';

export function normalizeHandleSearch(value: string) {
  return value.trim().replace(/^@/, '').toLocaleLowerCase('en-US');
}

export const handleSearchSchema = z.object({
  handle: z
    .string()
    .transform(normalizeHandleSearch)
    .pipe(
      z
        .string()
        .min(2, 'Digite pelo menos 2 caracteres depois do @.')
        .max(24, 'Use no máximo 24 caracteres.')
        .regex(/^[a-z0-9_]+$/, 'Use somente letras minúsculas, números ou _.'),
    ),
});

export const reportProfileSchema = z.object({
  details: z.string().trim().max(500, 'Use no máximo 500 caracteres.'),
  reason: z.enum(['spam', 'harassment', 'fake_profile', 'inappropriate_content', 'other']),
});

export type HandleSearchValues = z.input<typeof handleSearchSchema>;
export type ReportProfileValues = z.infer<typeof reportProfileSchema>;
