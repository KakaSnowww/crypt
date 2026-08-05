import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ServerOpenRoute } from './ServerOpenRoute';

const serverId = '70000000-0000-4000-8000-000000000001';
const channelId = '71000000-0000-4000-8000-000000000001';

vi.mock('../features/servers/servers.queries', () => ({
  useServerOverview: () => ({
    data: {
      default_channel_id: channelId,
    },
    error: null,
    isPending: false,
  }),
}));

vi.mock('../features/workspace/workspace.queries', () => ({
  useServerChannels: () => ({
    data: [
      {
        channel_id: channelId,
        channel_type: 'text',
      },
    ],
    error: null,
    isPending: false,
  }),
}));

describe('ServerOpenRoute', () => {
  it('redireciona para o canal padrão', async () => {
    render(
      <MemoryRouter initialEntries={[`/app/servidores/${serverId}/abrir`]}>
        <Routes>
          <Route element={<ServerOpenRoute />} path="/app/servidores/:serverId/abrir" />
          <Route element={<p>Canal aberto</p>} path="/app/servidores/:serverId/canais/:channelId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Canal aberto')).toBeVisible();
  });
});
