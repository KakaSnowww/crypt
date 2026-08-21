import { describe, expect, it } from 'vitest';
import { parseMessageAttachments, parseMessageReactions } from './messages.types';
import { MAX_PRO_MESSAGE_ATTACHMENT_BYTES, validateMessagePayload } from './messages.schemas';

describe('mensagens de canal', () => {
  it('aceita texto ou anexo e limita o tamanho do conteúdo', () => {
    expect(validateMessagePayload('  Olá, pessoal!  ', [])).toBe('Olá, pessoal!');
    expect(() => validateMessagePayload('x'.repeat(2_001), [])).toThrow();
    expect(() => validateMessagePayload('   ', [])).toThrow();
  });

  it('recusa mais de três anexos', () => {
    const files = Array.from(
      { length: 4 },
      (_, index) => new File(['ok'], `arquivo-${index}.txt`, { type: 'text/plain' }),
    );

    expect(() => validateMessagePayload('', files)).toThrow('no máximo 3');
  });

  it('aceita arquivo de até 500 MB quando o limite do Crypt Pro é aplicado', () => {
    const proFile = {
      name: 'projeto.zip',
      size: MAX_PRO_MESSAGE_ATTACHMENT_BYTES,
      type: 'application/zip',
    } as File;
    const oversizedFile = {
      ...proFile,
      size: MAX_PRO_MESSAGE_ATTACHMENT_BYTES + 1,
    } as File;

    expect(() =>
      validateMessagePayload('', [proFile], MAX_PRO_MESSAGE_ATTACHMENT_BYTES),
    ).not.toThrow();
    expect(() =>
      validateMessagePayload('', [oversizedFile], MAX_PRO_MESSAGE_ATTACHMENT_BYTES),
    ).toThrow('no máximo 500 MB');
  });

  it('descarta itens inválidos dos resumos recebidos do banco', () => {
    expect(
      parseMessageReactions([
        { count: 2, emoji: '💜', reacted_by_me: true },
        { count: 'inválido', emoji: '🔥', reacted_by_me: false },
      ]),
    ).toEqual([{ count: 2, emoji: '💜', reacted_by_me: true }]);
    expect(
      parseMessageAttachments([
        {
          attachment_id: 'id',
          mime_type: 'text/plain',
          original_name: 'nota.txt',
          size_bytes: 10,
          storage_path: 'servidor/canal/pessoa/id.txt',
        },
      ]),
    ).toHaveLength(1);
  });
});
