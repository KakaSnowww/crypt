import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/common/ToastContext';
import { ServerOnboardingRoute } from './ServerOnboardingRoute';

vi.mock('../features/server-onboarding/serverOnboarding.queries', () => ({
  serverOnboardingKeys: {
    status: (serverId: string) => ['server-onboarding', serverId],
  },
  useServerOnboardingStatus: () => ({
    data: {
      banner_path: null,
      channel_selection_required: false,
      completed_at: null,
      enabled_at: '2026-08-05T00:00:00Z',
      featured_channels: [],
      icon_path: null,
      is_owner: false,
      onboarding_completed: false,
      onboarding_enabled: true,
      onboarding_required: true,
      rules: [],
      rules_required: false,
      selected_channel_ids: [],
      server_description: 'Comunidade de teste.',
      server_id: '20000000-0000-4000-8000-000000000001',
      server_name: 'Crypt',
      settings_version: 1,
      welcome_message: 'Conheça nosso espaço.',
      welcome_title: 'Bem-vindo ao Crypt',
    },
    error: null,
    isPending: false,
  }),
}));

describe('ServerOnboardingRoute', () => {
  it('mostra a primeira etapa de boas-vindas', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <MemoryRouter
            initialEntries={['/app/servidores/20000000-0000-4000-8000-000000000001/entrada']}
          >
            <Routes>
              <Route element={<ServerOnboardingRoute />} path="/app/servidores/:serverId/entrada" />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Bem-vindo ao Crypt',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', {
        name: 'Entrar no servidor',
      }),
    ).toBeVisible();
  });
});
