import { describe, expect, it } from 'vitest';
import { buildGlobalSearchResultPath, searchHighlightParts } from './globalSearch.utils';
import type { GlobalSearchResult } from './globalSearch.types';

const baseResult: GlobalSearchResult = {
  attachment_count: 0,
  attachment_name: null,
  author_avatar_path: null,
  author_display_name: 'Kaio',
  author_handle: 'kaio',
  author_id: '10000000-0000-4000-8000-000000000001',
  channel_id: '30000000-0000-4000-8000-000000000001',
  conversation_id: null,
  created_at: '2026-08-05T00:00:00Z',
  message_content: 'Teste do Crypt',
  message_id: '40000000-0000-4000-8000-000000000001',
  place_name: 'Crypt',
  relevance: 1,
  result_kind: 'server',
  secondary_place_name: '#geral',
  server_id: '20000000-0000-4000-8000-000000000001',
};

describe('busca global', () => {
  it('abre o canal com o ID da mensagem', () => {
    expect(buildGlobalSearchResultPath(baseResult)).toContain(
      '?message=40000000-0000-4000-8000-000000000001',
    );
  });

  it('abre conversa privada com o ID da mensagem', () => {
    expect(
      buildGlobalSearchResultPath({
        ...baseResult,
        channel_id: null,
        conversation_id: '50000000-0000-4000-8000-000000000001',
        result_kind: 'direct',
        server_id: null,
      }),
    ).toBe(
      '/app/mensagens/50000000-0000-4000-8000-000000000001?message=40000000-0000-4000-8000-000000000001',
    );
  });

  it('destaca somente a expressão buscada', () => {
    expect(searchHighlightParts('O Crypt ficou melhor', 'Crypt')).toEqual([
      {
        highlighted: false,
        text: 'O ',
      },
      {
        highlighted: true,
        text: 'Crypt',
      },
      {
        highlighted: false,
        text: ' ficou melhor',
      },
    ]);
  });
});
