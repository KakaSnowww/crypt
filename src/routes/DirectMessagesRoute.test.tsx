import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DirectMessagesRoute } from './DirectMessagesRoute';

vi.mock('../features/directMessages/directMessages.queries', () => ({
  useDirectConversations: () => ({
    data: [
      {
        conversation_id: 'conversation-a',
        is_blocked: false,
        is_online: true,
        last_message_at: '2026-07-26T20:00:00Z',
        last_message_author_id: 'friend-a',
        last_message_preview: 'Mensagem privada segura',
        other_avatar_path: null,
        other_display_name: 'Amiga Teste',
        other_handle: 'amigateste',
        other_profile_id: 'friend-a',
        unread_count: 2,
      },
    ],
    isPending: false,
  }),
}));

vi.mock('../features/connections/connections.queries', () => ({
  useFriends: () => ({ data: [], isPending: false }),
}));

vi.mock('../features/directMessages/useDirectMessageActions', () => ({
  useDirectMessageActions: () => ({
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
    expect(screen.getByRole('link', { name: /Amiga Teste/i })).toHaveAttribute(
      'href',
      '/app/mensagens/conversation-a',
    );
  });
});
