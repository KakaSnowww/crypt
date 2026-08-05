import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { globalSearchPageSize, searchGlobalMessages } from './globalSearch.service';
import type { GlobalSearchInput, GlobalSearchResult } from './globalSearch.types';

export const globalSearchKeys = {
  all: ['global-search'] as const,
  result: (input: GlobalSearchInput) =>
    ['global-search', input.query, input.scope, input.serverId, input.order] as const,
};

export type GlobalMessageSearchData = InfiniteData<GlobalSearchResult[], number>;

export function useGlobalMessageSearch(
  input: GlobalSearchInput,
): UseInfiniteQueryResult<GlobalMessageSearchData, Error> {
  const enabled = input.query.trim().length >= 2;

  return useInfiniteQuery<
    GlobalSearchResult[],
    Error,
    GlobalMessageSearchData,
    ReturnType<typeof globalSearchKeys.result>,
    number
  >({
    enabled,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === globalSearchPageSize
        ? pages.reduce((total, page) => total + page.length, 0)
        : undefined,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => searchGlobalMessages(input, pageParam),
    queryKey: globalSearchKeys.result(input),
    staleTime: 20_000,
  });
}
