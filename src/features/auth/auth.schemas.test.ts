import { describe, expect, it } from 'vitest';
import { normalizeHandle, passwordUpdateSchema, registerSchema } from './auth.schemas';

const validRegistration = {
  confirmPassword: 'SenhaMuitoSegura123',
  displayName: 'Kaio Snow',
  email: 'kaio@example.com',
  handle: '@KaioSnow',
  password: 'SenhaMuitoSegura123',
};

describe('validação da autenticação', () => {
  it('normaliza o identificador sem diferenciar maiúsculas e minúsculas', () => {
    expect(normalizeHandle('  @KaioSnow  ')).toBe('kaiosnow');
  });

  it('aceita nome com espaço e acento', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      displayName: 'Kaio Vinícius',
    });

    expect(result.success).toBe(true);
  });

  it('rejeita identificadores reservados', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      handle: '@ADMIN',
    });

    expect(result.success).toBe(false);
  });

  it('exige confirmação idêntica para a nova senha', () => {
    const result = passwordUpdateSchema.safeParse({
      confirmPassword: 'OutraSenhaSegura123',
      password: 'SenhaMuitoSegura123',
    });

    expect(result.success).toBe(false);
  });
});
