import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import type { ChannelMessageRow } from '../features/messages/messages.types';
import { authenticatedAuthValue } from '../test/renderRoute';
import { ChannelRoute } from './ChannelRoute';

const sendMessage = vi.fn().mockResolvedValue('message-id');
const serverId = '70000000-0000-0000-0000-000000000001';
const channelId = '71000000-0000-0000-0000-000000000001';
const message: ChannelMessageRow = {
  attachment_summary: [],
  author_avatar_path: null,
  author_display_name: 'Kaio Snow',
  author_handle: 'kaiosnow',
  author_id: authenticatedAuthValue.user!.id,
  can_delete: true,
  can_edit: true,
  can_pin: true,
  channel_id: channelId,
  content: 'Bem-vindo ao canal!',
  created_at: '2026-07-26T05:00:00.000Z',
  deleted_at: null,
  edited_at: null,
  mentioned_channel_ids: [],
  mentioned_profile_ids: [],
  message_id: '72000000-0000-0000-0000-000000000001',
  pinned_at: null,
  reaction_summary: [],
  reply_author_display_name: null,
  reply_content: null,
  reply_to_id: null,
  server_id: serverId,
};

vi.mock('../features/profile/profile.queries', () => ({
  useCurrentProfile: () => ({
    data: { display_name: 'Kaio Snow' },
    isPending: false,
  }),
}));

vi.mock('../features/servers/servers.queries', () => ({
  useServerMembers: () => ({
    data: [
      {
        avatar_path: null,
        display_name: 'Kaio Snow',
        handle: 'kaiosnow',
        is_online: true,
        is_owner: true,
        joined_at: '2026-07-26T01:00:00.000Z',
        presence_status: 'online',
        profile_id: authenticatedAuthValue.user!.id,
      },
      {
        avatar_path: null,
        display_name: 'Kaio Teste',
        handle: 'kaioteste',
        is_online: true,
        is_owner: false,
        joined_at: '2026-07-26T01:10:00.000Z',
        presence_status: 'online',
        profile_id: '50000000-0000-0000-0000-000000000002',
      },
    ],
    isPending: false,
  }),
  useServerOverview: () => ({
    data: { server_name: 'Órbita do Snow' },
    isPending: false,
  }),
}));

vi.mock('../features/workspace/workspace.queries', () => ({
  useServerChannels: () => ({
    data: [
      {
        category_id: null,
        channel_icon: '💬',
        channel_id: channelId,
        channel_name: 'Conversa Geral',
        channel_position: 0,
        created_at: '2026-07-26T01:00:00.000Z',
        effective_permissions: 131_071,
        is_read_only: false,
        normalized_name: 'conversa geral',
        slowmode_seconds: 0,
        topic: 'Boas-vindas e conversa livre.',
      },
    ],
    isPending: false,
  }),
}));

vi.mock('../features/messages/messages.queries', () => ({
  useChannelMessages: () => ({
    data: { pages: [[message]] },
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isPending: false,
  }),
}));

vi.mock('../features/messages/messages.service', () => ({
  markChannelRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../features/messages/useChannelRealtime', () => ({
  useChannelRealtime: () => ({
    announceTyping: vi.fn(),
    typingNames: [],
  }),
}));

vi.mock('../features/messages/useMessageActions', () => ({
  useMessageActions: () => ({
    delete: mutation(vi.fn()),
    edit: mutation(vi.fn()),
    pin: mutation(vi.fn()),
    react: mutation(vi.fn()),
    send: mutation(sendMessage),
  }),
}));

describe('ChannelRoute', () => {
  it('sugere um membro, insere a menção e envia seu id', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={[`/app/servidores/${serverId}/canais/${channelId}`]}>
        <AppProviders authValue={authenticatedAuthValue}>
          <Routes>
            <Route element={<ChannelRoute />} path="/app/servidores/:serverId/canais/:channelId" />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Conversa Geral' })).toBeVisible();
    expect(screen.getByText('Bem-vindo ao canal!')).toBeVisible();
    expect(screen.getByRole('main')).toHaveClass('chat-layout');
    expect(screen.getByLabelText('Mensagens de Conversa Geral')).toHaveClass('chat-scroll');

    const composer = screen.getByRole('textbox', { name: 'Mensagem para Conversa Geral' });
    await user.type(composer, 'Olá @ka');
    expect(screen.getByRole('option', { name: /Kaio Teste/ })).toBeVisible();

    await user.keyboard('{Enter}');
    expect(composer).toHaveValue('Olá @kaioteste ');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId,
        content: 'Olá @kaioteste ',
        profileMentionIds: ['50000000-0000-0000-0000-000000000002'],
        serverId,
      }),
    );
  });
});

function mutation(mutateAsync: ReturnType<typeof vi.fn>) {
  return {
    isPending: false,
    mutate: vi.fn(),
    mutateAsync,
  };
}
