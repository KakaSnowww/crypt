import {
  ArrowUpRight,
  Clock3,
  File,
  Hash,
  LoaderCircle,
  MessageCircle,
  Search,
  SearchX,
  Server,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar';
import { useGlobalMessageSearch } from '../features/search/globalSearch.queries';
import type {
  GlobalSearchOrder,
  GlobalSearchResult,
  GlobalSearchScope,
} from '../features/search/globalSearch.types';
import {
  buildGlobalSearchResultPath,
  searchHighlightParts,
} from '../features/search/globalSearch.utils';
import '../features/search/globalSearch.css';
import { useMyServers } from '../features/servers/servers.queries';

function validScope(value: null | string): GlobalSearchScope {
  return value === 'servers' || value === 'direct' ? value : 'all';
}

function validOrder(value: null | string): GlobalSearchOrder {
  return value === 'recent' ? 'recent' : 'relevance';
}

export function GlobalSearchRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const scope = validScope(searchParams.get('scope'));
  const order = validOrder(searchParams.get('order'));
  const serverId = searchParams.get('server');
  const [draft, setDraft] = useState(query);
  const serversQuery = useMyServers();
  const searchQuery = useGlobalMessageSearch({
    order,
    query,
    scope,
    serverId: scope === 'direct' ? null : serverId,
  });

  useEffect(() => {
    const synchronizeTimeout = window.setTimeout(() => {
      setDraft(query);
    }, 0);

    return () => window.clearTimeout(synchronizeTimeout);
  }, [query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalized = draft.trim();
      const next = new URLSearchParams(searchParams);

      if (normalized) {
        next.set('q', normalized);
      } else {
        next.delete('q');
      }

      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, {
          replace: true,
        });
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft, searchParams, setSearchParams]);

  const results = useMemo<GlobalSearchResult[]>(
    () => searchQuery.data?.pages.flat() ?? [],
    [searchQuery.data?.pages],
  );
  const ready = query.trim().length >= 2;

  function updateParam(name: string, value: null | string) {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }

    setSearchParams(next, {
      replace: true,
    });
  }

  return (
    <main className="global-search-page mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
      <section className="global-search-hero p-5 sm:p-8">
        <div className="relative">
          <p className="eyebrow flex items-center gap-2">
            <Search size={14} />
            Busca global
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            Encontre qualquer conversa.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
            Pesquise somente no histórico que sua conta ainda pode acessar. Canais ocultos, grupos
            externos e conversas fechadas não aparecem.
          </p>

          <label className="global-search-input relative mt-6">
            <Search aria-hidden="true" size={19} />
            <span className="sr-only">Pesquisar mensagens e anexos</span>
            <input
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Mensagem, assunto ou nome de arquivo"
              type="search"
              value={draft}
            />
            <kbd>Ctrl K</kbd>
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(
              [
                ['all', 'Tudo', Search],
                ['servers', 'Servidores', Server],
                ['direct', 'Privadas', MessageCircle],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                className={`global-search-filter ${scope === value ? 'is-active' : ''}`}
                key={value}
                onClick={() => {
                  updateParam('scope', value === 'all' ? null : value);

                  if (value === 'direct') {
                    updateParam('server', null);
                  }
                }}
                type="button"
              >
                <Icon aria-hidden="true" size={14} />
                {label}
              </button>
            ))}

            {scope !== 'direct' ? (
              <select
                aria-label="Filtrar por servidor"
                className="global-search-select"
                onChange={(event) => updateParam('server', event.target.value || null)}
                value={serverId ?? ''}
              >
                <option value="">Todos os servidores</option>
                {(serversQuery.data ?? []).map((server) => (
                  <option key={server.server_id} value={server.server_id}>
                    {server.server_name}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              aria-label="Ordenar resultados"
              className="global-search-select"
              onChange={(event) =>
                updateParam('order', event.target.value === 'recent' ? 'recent' : null)
              }
              value={order}
            >
              <option value="relevance">Mais relevantes</option>
              <option value="recent">Mais recentes</option>
            </select>

            <span className="ml-auto hidden items-center gap-1.5 text-[0.64rem] text-crypt-subtle sm:flex">
              <SlidersHorizontal aria-hidden="true" size={13} />
              Texto e nomes de anexos
            </span>
          </div>
        </div>
      </section>

      <section aria-live="polite" className="mt-5">
        {!ready ? (
          <div className="global-search-empty">
            <div>
              <Search className="mx-auto text-violet-300" size={28} />
              <h2 className="mt-4 font-semibold text-white">Digite pelo menos dois caracteres</h2>
              <p className="mt-2 text-sm">O histórico permanece privado e é filtrado no banco.</p>
            </div>
          </div>
        ) : searchQuery.isPending ? (
          <div className="grid min-h-72 place-items-center">
            <Spinner />
          </div>
        ) : searchQuery.error ? (
          <div className="global-search-empty border-red-400/20 text-red-200">
            <div>
              <SearchX className="mx-auto" size={28} />
              <h2 className="mt-4 font-semibold">Não foi possível pesquisar</h2>
              <p className="mt-2 max-w-lg text-sm leading-6">{searchQuery.error.message}</p>
            </div>
          </div>
        ) : results.length ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="text-xs text-crypt-subtle">
                {results.length}{' '}
                {results.length === 1 ? 'resultado carregado' : 'resultados carregados'}
              </p>
              <span className="flex items-center gap-1.5 text-[0.64rem] text-crypt-subtle">
                <Clock3 size={12} />
                Clique para abrir e destacar
              </span>
            </div>

            <div className="grid gap-2">
              {results.map((result) => {
                const preview =
                  result.message_content ?? result.attachment_name ?? 'Mensagem com anexo';
                const ContextIcon = result.result_kind === 'server' ? Hash : MessageCircle;

                return (
                  <Link
                    className="global-search-result"
                    key={`${result.result_kind}-${result.message_id}`}
                    to={buildGlobalSearchResultPath(result)}
                  >
                    <div className="global-search-result__context">
                      <ContextIcon aria-hidden="true" size={14} />
                      <strong>{result.place_name}</strong>
                      <span>·</span>
                      <span>{result.secondary_place_name}</span>
                    </div>

                    <div className="global-search-result__message">
                      <ProfileAvatar
                        avatarPath={result.author_avatar_path}
                        displayName={result.author_display_name}
                        size="sm"
                      />

                      <div className="global-search-result__body">
                        <div className="global-search-result__author">
                          <strong>{result.author_display_name}</strong>
                          <span>@{result.author_handle}</span>
                          <time dateTime={result.created_at}>
                            {formatResultDate(result.created_at)}
                          </time>
                        </div>

                        <p className="global-search-result__preview">
                          {searchHighlightParts(preview, query).map((part, index) =>
                            part.highlighted ? (
                              <mark key={`${part.text}-${index}`}>{part.text}</mark>
                            ) : (
                              <span key={`${part.text}-${index}`}>{part.text}</span>
                            ),
                          )}
                        </p>

                        {result.attachment_count > 0 ? (
                          <span className="global-search-result__attachment">
                            <File aria-hidden="true" size={12} />
                            {result.attachment_name ?? 'Anexo'}
                            {result.attachment_count > 1 ? ` +${result.attachment_count - 1}` : ''}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <ArrowUpRight
                      aria-hidden="true"
                      className="global-search-result__open"
                      size={16}
                    />
                  </Link>
                );
              })}
            </div>

            {searchQuery.hasNextPage ? (
              <div className="mt-5 text-center">
                <Button
                  leadingIcon={
                    searchQuery.isFetchingNextPage ? (
                      <LoaderCircle className="animate-spin" size={15} />
                    ) : undefined
                  }
                  loading={searchQuery.isFetchingNextPage}
                  onClick={() => void searchQuery.fetchNextPage()}
                  variant="secondary"
                >
                  Carregar mais resultados
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="global-search-empty">
            <div>
              <SearchX className="mx-auto text-crypt-subtle" size={28} />
              <h2 className="mt-4 font-semibold text-white">Nenhuma mensagem encontrada</h2>
              <p className="mt-2 max-w-lg text-sm leading-6">
                Tente outra expressão, remova o filtro de servidor ou pesquise em todo o histórico.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function formatResultDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}
