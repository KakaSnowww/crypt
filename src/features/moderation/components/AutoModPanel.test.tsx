import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../../components/common/ToastProvider';
import { AutoModPanel } from './AutoModPanel';

vi.mock('../automod.queries', () => ({
  autoModKeys: {
    all: (serverId: string) => ['automod', serverId],
  },
  useServerAutoModEvents: () => ({
    data: [],
    isPending: false,
  }),
  useServerAutoModSettings: () => ({
    data: {
      block_duplicates: true,
      block_external_links: false,
      block_invite_links: false,
      block_spam: true,
      blocked_terms: [],
      duplicate_window_seconds: 30,
      enabled: false,
      interval_seconds: 10,
      max_mentions: 8,
      max_messages: 5,
      updated_at: '2026-08-05T00:00:00Z',
    },
    error: null,
    isPending: false,
  }),
}));

describe('AutoModPanel', () => {
  it('mostra as regras e o estado inicial', () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: {
                retry: false,
              },
            },
          })
        }
      >
        <ToastProvider>
          <AutoModPanel isOwner serverId="70000000-0000-4000-8000-000000000001" />
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Proteção automática')).toBeVisible();
    expect(screen.getByText('Bloqueios recentes')).toBeVisible();
    expect(
      screen.getByRole('button', {
        name: 'Salvar AutoMod',
      }),
    ).toBeVisible();
  });
});
