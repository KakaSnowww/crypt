import { describe, expect, it } from 'vitest';
import {
  handleSearchSchema,
  normalizeHandleSearch,
  reportProfileSchema,
} from './connections.schemas';

describe('busca por identificador', () => {
  it('remove @, espaços e diferença entre maiúsculas e minúsculas', () => {
    expect(normalizeHandleSearch('  @KaioSnow  ')).toBe('kaiosnow');
  });

  it('aceita busca parcial limitada e recusa caracteres inválidos', () => {
    expect(handleSearchSchema.safeParse({ handle: '@ka' }).success).toBe(true);
    expect(handleSearchSchema.safeParse({ handle: '@k' }).success).toBe(false);
    expect(handleSearchSchema.safeParse({ handle: '@kaio snow' }).success).toBe(false);
  });
});

describe('denúncia de perfil', () => {
  it('aceita somente motivos controlados e limita os detalhes', () => {
    expect(
      reportProfileSchema.safeParse({
        details: 'Comportamento repetitivo.',
        reason: 'spam',
      }).success,
    ).toBe(true);
    expect(
      reportProfileSchema.safeParse({
        details: 'a'.repeat(501),
        reason: 'other',
      }).success,
    ).toBe(false);
    expect(
      reportProfileSchema.safeParse({
        details: '',
        reason: 'motivo_inventado',
      }).success,
    ).toBe(false);
  });
});
