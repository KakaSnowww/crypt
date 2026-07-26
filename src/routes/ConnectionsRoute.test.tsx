import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import type { FriendSuggestion, SearchProfile } from '../features/connections/connections.types';
import { authenticatedAuthValue } from '../test/renderRoute';
import { ConnectionsRoute } from './ConnectionsRoute';

const searchResult: SearchProfile = {
  allow_friend_requests: true,
  avatar_path: null,
  bio: 'Gosta de música e tecnologia.',
  display_name: 'Luna Crypt',
  handle: 'lunacrypt',
  mutual_friend_count: 1,
  profile_id: '50000000-0000-0000-0000-000000000002',
  relationship_status: 'none',
};

const suggestion: FriendSuggestion = {
  avatar_path: null,
  bio: 'Criando coisas novas.',
  display_name: 'Theo Crypt',
  handle: 'theocrypt',
  mutual_friend_count: 2,
  profile_id: '50000000-0000-0000-0000-000000000003',
  score: 13,
  shared_category_labels: ['Música'],
  shared_interest_labels: ['Rock'],
};

vi.mock('../features/connections/connections.queries', () => ({
  connectionKeys: {
    all: ['connections'],
    notifications: ['connections', 'notifications'],
  },
  useBlockedProfiles: () => queryResult([]),
  useConnectionNotifications: () => queryResult([]),
  useFriendSuggestions: () => queryResult([suggestion]),
  useFriends: () => queryResult([]),
  useProfileSearch: (term: string) => queryResult(term ? [searchResult] : []),
  useReceivedFriendRequests: () => queryResult([]),
  useSentFriendRequests: () => queryResult([]),
}));

vi.mock('../features/profile/profile.queries', () => ({
  useProfileSettings: () =>
    queryResult({
      use_interests_for_suggestions: true,
    }),
}));

describe('ConnectionsRoute', () => {
  it('busca pelo @ e explica sugestões de forma objetiva', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppProviders authValue={authenticatedAuthValue}>
          <ConnectionsRoute />
        </AppProviders>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Conexões' })).toBeVisible();

    await user.type(screen.getByRole('textbox', { name: 'Identificador' }), '@Luna');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Luna Crypt')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();

    await user.click(screen.getByRole('tab', { name: 'Descobrir' }));

    expect(screen.getByText('Theo Crypt')).toBeVisible();
    expect(screen.getByText(/Vocês gostam de/)).toBeVisible();
    expect(screen.getByText(/Não usamos IA nem diagnósticos/)).toBeVisible();
  });
});

function queryResult<T>(data: T) {
  return {
    data,
    error: null,
    isFetching: false,
    isPending: false,
  };
}
