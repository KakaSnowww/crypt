import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../../components/common/ToastProvider';
import { ServerInvitePeopleButton } from './ServerInvitePeopleButton';

const mocks = vi.hoisted(() => ({
  createInvite: vi.fn().mockResolvedValue('70000000-0000-4000-8000-000000000001'),
  openConversation: vi.fn().mockResolvedValue('80000000-0000-4000-8000-000000000001'),
  refetchConversations: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue('90000000-0000-4000-8000-000000000001'),
  conversations: [] as Array<{
    conversation_id: string;
    conversation_type: 'direct' | 'group';
    other_profile_id: null | string;
  }>,
}));

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: '10000000-0000-4000-8000-000000000001' },
  }),
}));

vi.mock('../../connections/connections.queries', () => ({
  useFriends: () => ({
    data: [
      {
        avatar_path: null,
        bio: null,
        display_name: 'Crypt Tester',
        friendship_created_at: '2026-08-03T20:00:00.000Z',
        handle: 'crypttester',
        is_online: true,
        mutual_friend_count: 0,
        presence_status: 'online',
        profile_id: '20000000-0000-4000-8000-000000000001',
      },
    ],
    error: null,
    isPending: false,
  }),
}));

vi.mock('../../directMessages/directMessages.queries', () => ({
  directMessageKeys: {
    conversation: (id: string) => ['direct-messages', 'conversation', id],
    list: ['direct-messages', 'list'],
  },
  useDirectConversations: () => ({
    data: mocks.conversations,
    error: null,
    isPending: false,
    refetch: mocks.refetchConversations,
  }),
}));

vi.mock('../../directMessages/directMessages.service', () => ({
  openDirectConversation: mocks.openConversation,
  sendDirectMessage: mocks.sendMessage,
}));

vi.mock('../servers.queries', () => ({
  serverKeys: {
    invites: (id: string) => ['servers', 'invites', id],
  },
}));

vi.mock('../servers.service', () => ({
  createServerInvite: mocks.createInvite,
  getServerMediaUrl: () => null,
}));

function renderButton() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <ServerInvitePeopleButton
            bannerPath={null}
            iconPath={null}
            memberProfileIds={[]}
            serverDescription="Servidor de teste."
            serverId="30000000-0000-4000-8000-000000000001"
            serverName="Cripta de Teste"
          />
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ServerInvitePeopleButton', () => {
  beforeEach(() => {
    mocks.conversations = [];
    mocks.createInvite.mockClear();
    mocks.openConversation.mockClear();
    mocks.sendMessage.mockClear();
    mocks.refetchConversations.mockReset().mockResolvedValue({ data: [] });
  });

  it('reutiliza uma DM existente antes de tentar abrir outra', async () => {
    mocks.conversations = [
      {
        conversation_id: '81000000-0000-4000-8000-000000000001',
        conversation_type: 'direct',
        other_profile_id: '20000000-0000-4000-8000-000000000001',
      },
    ];

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Convidar pessoas' }));
    await user.click(screen.getByRole('button', { name: 'Convidar' }));

    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledTimes(1));
    expect(mocks.openConversation).not.toHaveBeenCalled();
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: '81000000-0000-4000-8000-000000000001',
      }),
    );
  });

  it('abre uma DM quando ainda não existe conversa com o amigo', async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Convidar pessoas' }));
    await user.click(screen.getByRole('button', { name: 'Convidar' }));

    await waitFor(() => expect(mocks.openConversation).toHaveBeenCalledTimes(1));
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: '80000000-0000-4000-8000-000000000001',
      }),
    );
    expect(await screen.findByRole('button', { name: 'Enviado' })).toBeDisabled();
  });

  it('recupera uma conversa existente quando a abertura retorna erro', async () => {
    mocks.openConversation.mockRejectedValueOnce(new Error('race'));
    mocks.refetchConversations.mockResolvedValueOnce({
      data: [
        {
          conversation_id: '82000000-0000-4000-8000-000000000001',
          conversation_type: 'direct',
          other_profile_id: '20000000-0000-4000-8000-000000000001',
        },
      ],
    });

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Convidar pessoas' }));
    await user.click(screen.getByRole('button', { name: 'Convidar' }));

    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledTimes(1));
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: '82000000-0000-4000-8000-000000000001',
      }),
    );
  });
});
