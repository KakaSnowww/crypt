import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import type { ServerInvitePreview } from '../features/servers/servers.types';
import { authenticatedAuthValue } from '../test/renderRoute';
import { ServerInviteRoute } from './ServerInviteRoute';

const joinServer = vi.fn().mockResolvedValue('70000000-0000-0000-0000-000000000001');

const preview: ServerInvitePreview = {
  already_member: false,
  banner_path: null,
  expires_at: '2026-07-27T01:00:00.000Z',
  icon_path: null,
  member_count: 2,
  owner_display_name: 'Kaio Snow',
  remaining_uses: 3,
  server_description: 'Comunidade privada de teste.',
  server_id: '70000000-0000-0000-0000-000000000001',
  server_name: 'Órbita do Snow',
};

vi.mock('../features/servers/servers.queries', () => ({
  useServerInvitePreview: () => ({
    data: preview,
    error: null,
    isPending: false,
  }),
}));

vi.mock('../features/servers/useServerActions', () => ({
  useServerActions: () => ({
    join: {
      error: null,
      isPending: false,
      mutateAsync: joinServer,
    },
  }),
}));

describe('ServerInviteRoute', () => {
  it('mostra a prévia antes de aceitar o convite', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/app/convite/abcdefabcdefabcdefabcdefabcdefabcdef']}>
        <AppProviders authValue={authenticatedAuthValue}>
          <Routes>
            <Route element={<ServerInviteRoute />} path="/app/convite/:code" />
            <Route element={<p>Servidor aberto</p>} path="/app/servidores/:serverId" />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Órbita do Snow' })).toBeVisible();
    expect(screen.getByText('Kaio Snow')).toBeVisible();
    expect(screen.getByText('3')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Aceitar convite' }));

    expect(joinServer).toHaveBeenCalledWith('abcdefabcdefabcdefabcdefabcdefabcdef');
    expect(await screen.findByText('Servidor aberto')).toBeVisible();
  });
});
