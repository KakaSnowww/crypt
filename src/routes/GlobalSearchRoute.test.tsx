import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GlobalSearchRoute } from './GlobalSearchRoute';

vi.mock('../features/servers/servers.queries', () => ({
  useMyServers: () => ({
    data: [],
    isPending: false,
  }),
}));

vi.mock('../features/search/globalSearch.queries', () => ({
  useGlobalMessageSearch: () => ({
    data: undefined,
    error: null,
    hasNextPage: false,
    isPending: false,
  }),
}));

describe('GlobalSearchRoute', () => {
  it('pede dois caracteres antes de pesquisar', () => {
    render(
      <MemoryRouter initialEntries={['/app/busca']}>
        <GlobalSearchRoute />
      </MemoryRouter>,
    );

    expect(screen.getByText('Digite pelo menos dois caracteres')).toBeVisible();
    expect(screen.getByRole('searchbox')).toBeVisible();
  });
});
