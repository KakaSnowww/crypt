import type { GlobalSearchResult } from './globalSearch.types';

export function buildGlobalSearchResultPath(result: GlobalSearchResult) {
  const messageQuery = `message=${encodeURIComponent(result.message_id)}`;

  if (result.result_kind === 'server' && result.server_id && result.channel_id) {
    return (
      `/app/servidores/${result.server_id}` + `/canais/${result.channel_id}` + `?${messageQuery}`
    );
  }

  if (result.result_kind === 'direct' && result.conversation_id) {
    return `/app/mensagens/` + `${result.conversation_id}` + `?${messageQuery}`;
  }

  return '/app/busca';
}

export function searchHighlightParts(text: string, query: string) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [
      {
        highlighted: false,
        text,
      },
    ];
  }

  const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const expression = new RegExp(`(${escaped})`, 'giu');

  return text
    .split(expression)
    .filter(Boolean)
    .map((part) => ({
      highlighted: part.toLocaleLowerCase('pt-BR') === normalizedQuery.toLocaleLowerCase('pt-BR'),
      text: part,
    }));
}
