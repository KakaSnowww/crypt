import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import type { ServerSummary } from '../features/servers/servers.types';
import { authenticatedAuthValue } from '../test/renderRoute';
import { ServersRoute } from './ServersRoute';

const createServer = vi.fn().mockResolvedValue('70000000-0000-0000-0000-000000000001');

const server: ServerSummary = {
  banner_path: null,
  created_at: '2026-07-26T01:00:00.000Z',
  default_channel_id: '71000000-0000-0000-0000-000000000001',
  default_channel_name: 'Conversa Geral',
  icon_path: null,
  is_owner: true,
  joined_at: '2026-07-26T01:00:00.000Z',
  member_count: 2,
  owner_id: '10000000-0000-0000-0000-000000000001',
  server_description: 'Comunidade privada de teste.',
  server_id: '70000000-0000-0000-0000-000000000001',
  server_name: 'Órbita do Snow',
};

vi.mock('../features/servers/servers.queries', () => ({
  useMyServers: () => queryResult([server]),
}));

vi.mock('../features/servers/useServerActions', () => ({
  useServerActions: () => ({
    create: mutation(createServer),
    join: mutation(vi.fn()),
  }),
}));

describe('ServersRoute', () => {
  it('lista servidores e cria um espaço privado', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppProviders authValue={authenticatedAuthValue}>
          <ServersRoute />
        </AppProviders>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Seus servidores' })).toBeVisible();
    expect(screen.getByText('Órbita do Snow')).toBeVisible();
    expect(screen.getByText('2 membros')).toBeVisible();

    await user.click(screen.getAllByRole('button', { name: 'Criar servidor' }).at(-1)!);
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Jogos com Amigos');
    await user.type(
      screen.getByRole('textbox', { name: 'Descrição' }),
      'Espaço para jogar em grupo.',
    );
    await user.click(screen.getAllByRole('button', { name: 'Criar servidor' }).at(-1)!);

    expect(createServer).toHaveBeenCalledWith({
      description: 'Espaço para jogar em grupo.',
      name: 'Jogos com Amigos',
    });
  });
});

function queryResult<T>(data: T) {
  return {
    data,
    error: null,
    isPending: false,
  };
}

function mutation(mutateAsync: ReturnType<typeof vi.fn>) {
  return {
    error: null,
    isPending: false,
    mutateAsync,
    reset: vi.fn(),
  };
}
