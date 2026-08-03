import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DirectMessagesRoute } from './DirectMessagesRoute';

vi.mock('../features/directMessages/directMessages.queries', () => ({
  useDirectConversations: () => ({
    data: [
      {
        conversation_avatar_path: null,
        conversation_id: 'conversation-a',
        conversation_title: 'Amiga Teste',
        conversation_type: 'direct',
        is_blocked: false,
        is_online: true,
        is_owner: false,
        last_message_at: '2026-07-26T20:00:00Z',
        last_message_author_id: 'friend-a',
        last_message_preview: 'Mensagem privada segura',
        member_count: 2,
        other_avatar_path: null,
        other_display_name: 'Amiga Teste',
        other_handle: 'amigateste',
        other_profile_id: 'friend-a',
        unread_count: 2,
      },
      {
        conversation_avatar_path: null,
        conversation_id: 'group-a',
        conversation_title: 'Equipe do Crypt',
        conversation_type: 'group',
        is_blocked: false,
        is_online: true,
        is_owner: true,
        last_message_at: '2026-07-26T21:00:00Z',
        last_message_author_id: 'friend-b',
        last_message_preview: 'Vamos entrar na chamada?',
        member_count: 4,
        other_avatar_path: null,
        other_display_name: null,
        other_handle: null,
        other_profile_id: null,
        unread_count: 0,
      },
    ],
    isPending: false,
  }),
}));

vi.mock('../features/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'current-user' } }),
}));

vi.mock('../features/connections/connections.queries', () => ({
  useFriends: () => ({ data: [], isPending: false }),
}));

vi.mock('../features/directMessages/useDirectMessageActions', () => ({
  useDirectMessageActions: () => ({
    createGroup: { isPending: false, mutateAsync: vi.fn() },
    hide: { mutate: vi.fn() },
    open: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

describe('lista de mensagens privadas', () => {
  it('mostra a conversa, prévia e contador de não lidas', () => {
    render(
      <MemoryRouter>
        <DirectMessagesRoute />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Mensagens privadas' })).toBeInTheDocument();
    expect(screen.getByText('Amiga Teste')).toBeInTheDocument();
    expect(screen.getByText('Mensagem privada segura')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Equipe do Crypt')).toBeInTheDocument();
    expect(screen.getByText('4 membros')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Amiga Teste/i })).toHaveAttribute(
      'href',
      '/app/mensagens/conversation-a',
    );
  });
});
