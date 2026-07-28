import { describe, expect, it } from 'vitest';
import { categorySchema, channelSchema, roleSchema } from './workspace.schemas';

describe('schemas do espaço do servidor', () => {
  it('preserva espaços, maiúsculas, acentos e emojis nos nomes', () => {
    expect(categorySchema.parse('  🎨 Arte e Criação  ')).toBe('🎨 Arte e Criação');
    expect(
      channelSchema.parse({
        categoryId: null,
        channelType: 'text',
        icon: '🎮',
        isReadOnly: false,
        name: '  Games e Resenha 🎮  ',
        slowmodeSeconds: 15,
        topic: '  Partidas com amigos.  ',
      }),
    ).toMatchObject({
      icon: '🎮',
      name: 'Games e Resenha 🎮',
      topic: 'Partidas com amigos.',
    });
  });

  it('valida cargo, cor e máscara de permissões', () => {
    expect(
      roleSchema.parse({
        color: '#8b5cf6',
        displaySeparately: true,
        name: 'Criadores',
        permissions: 12_288,
      }),
    ).toMatchObject({ name: 'Criadores', permissions: 12_288 });
  });

  it('recusa modo lento e máscara fora dos limites', () => {
    expect(
      channelSchema.safeParse({
        categoryId: null,
        channelType: 'text',
        icon: '#',
        isReadOnly: false,
        name: 'Geral',
        slowmodeSeconds: 21_601,
        topic: '',
      }).success,
    ).toBe(false);
    expect(
      roleSchema.safeParse({
        color: '#000000',
        displaySeparately: false,
        name: 'Cargo',
        permissions: 131_072,
      }).success,
    ).toBe(false);
  });
});
