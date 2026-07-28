import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import { authenticatedAuthValue } from '../test/renderRoute';
import { NotificationsRoute } from './NotificationsRoute';

vi.mock('../features/notifications/notifications.queries', () => ({
  notificationKeys: {
    all: ['notifications'],
    preferences: ['notifications', 'preferences'],
  },
  useNotificationPreferences: () => queryResult(undefined),
  useNotifications: () =>
    queryResult([
      {
        actor_avatar_path: null,
        actor_display_name: 'Luna Crypt',
        actor_handle: 'lunacrypt',
        actor_id: '50000000-0000-0000-0000-000000000002',
        body: 'Luna Crypt enviou uma mensagem.',
        created_at: '2026-07-28T18:00:00.000Z',
        notification_id: '60000000-0000-0000-0000-000000000001',
        notification_type: 'direct_message',
        read_at: null,
        resource_id: '70000000-0000-0000-0000-000000000001',
        target_path: '/app/mensagens/70000000-0000-0000-0000-000000000001',
        title: 'Nova mensagem de Luna Crypt',
      },
    ]),
}));

vi.mock('../features/notifications/notifications.service', () => ({
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  saveNotificationPreferences: vi.fn(),
}));

describe('NotificationsRoute', () => {
  it('mostra a central unificada e destaca atividade não lida', () => {
    render(
      <MemoryRouter>
        <AppProviders authValue={authenticatedAuthValue}>
          <NotificationsRoute />
        </AppProviders>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Notificações' })).toBeVisible();
    expect(screen.getByText('Nova mensagem de Luna Crypt')).toBeVisible();
    expect(screen.getByRole('button', { name: /Marcar todas como lidas/ })).toBeEnabled();
    expect(screen.getByLabelText('Não lida')).toBeVisible();
  });
});

function queryResult<T>(data: T) {
  return {
    data,
    error: null,
    isPending: false,
  };
}
