import { z } from 'zod';

export const RESERVED_HANDLES = new Set([
  'admin',
  'administrador',
  'crypt',
  'everyone',
  'here',
  'moderacao',
  'oficial',
  'sistema',
  'suporte',
]);

export const PASSWORD_MIN_LENGTH = 12;

export function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, '').toLocaleLowerCase('en-US');
}

const emailSchema = z.email('Informe um e-mail válido.').trim().max(254, 'O e-mail é muito longo.');

const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Use pelo menos 2 caracteres.')
  .max(48, 'Use no máximo 48 caracteres.')
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} ._'’()-]*$/u,
    'Use letras, números, espaços e pontuação simples.',
  );

const handleSchema = z
  .string()
  .trim()
  .superRefine((value, context) => {
    const normalizedHandle = normalizeHandle(value);

    if (!/^[a-z0-9_]{3,24}$/.test(normalizedHandle)) {
      context.addIssue({
        code: 'custom',
        message: 'Use de 3 a 24 letras minúsculas, números ou _.',
      });
    }

    if (RESERVED_HANDLES.has(normalizedHandle)) {
      context.addIssue({
        code: 'custom',
        message: 'Este identificador é reservado pelo Crypt.',
      });
    }
  });

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(72, 'Use no máximo 72 caracteres.')
  .regex(/[a-z]/, 'Inclua pelo menos uma letra minúscula.')
  .regex(/[A-Z]/, 'Inclua pelo menos uma letra maiúscula.')
  .regex(/[0-9]/, 'Inclua pelo menos um número.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Digite sua senha.').max(72, 'A senha é muito longa.'),
});

export const registerSchema = z
  .object({
    confirmPassword: z.string(),
    displayName: displayNameSchema,
    email: emailSchema,
    handle: handleSchema,
    password: passwordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

export const passwordRecoverySchema = z.object({
  email: emailSchema,
});

export const passwordUpdateSchema = z
  .object({
    confirmPassword: z.string(),
    password: passwordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

export const accountDeletionSchema = z.object({
  confirmation: z
    .string()
    .refine((value): boolean => value === 'EXCLUIR', 'Digite EXCLUIR exatamente como mostrado.'),
  password: z.string().min(1, 'Digite sua senha atual.').max(72, 'A senha é muito longa.'),
});

export type AccountDeletionValues = z.infer<typeof accountDeletionSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type PasswordRecoveryValues = z.infer<typeof passwordRecoverySchema>;
export type PasswordUpdateValues = z.infer<typeof passwordUpdateSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
