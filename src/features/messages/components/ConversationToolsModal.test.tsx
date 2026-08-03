import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConversationToolsModal } from './ConversationToolsModal';

vi.mock('./MessageAttachmentCard', () => ({
  MessageAttachmentCard: ({ attachment }: { attachment: { original_name: string } }) => (
    <span>{attachment.original_name}</span>
  ),
}));

const messages = [
  {
    attachment_summary: [],
    author_display_name: 'Kaio Snow',
    author_handle: 'kaiosnow',
    content: 'Planejamento da comunidade roxa',
    created_at: '2026-08-03T12:00:00.000Z',
    deleted_at: null,
    message_id: 'message-one',
    pinned_at: '2026-08-03T12:05:00.000Z',
  },
  {
    attachment_summary: [
      {
        attachment_id: 'attachment-one',
        mime_type: 'image/png',
        original_name: 'preview.png',
        size_bytes: 120,
        storage_path: 'server/preview.png',
      },
    ],
    author_display_name: 'Kaio Teste',
    author_handle: 'kaioteste',
    content: 'Nova imagem do servidor',
    created_at: '2026-08-03T13:00:00.000Z',
    deleted_at: null,
    message_id: 'message-two',
    pinned_at: null,
  },
];

describe('ConversationToolsModal', () => {
  it('pesquisa mensagens e separa mídias e fixadas', async () => {
    const user = userEvent.setup();
    render(
      <ConversationToolsModal
        canLoadMore={false}
        loadingMore={false}
        messages={messages}
        onLoadMore={vi.fn()}
        onOpenChange={vi.fn()}
        open
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Buscar texto' }), 'comunidade');
    expect(screen.getByText('Planejamento da comunidade roxa')).toBeInTheDocument();
    expect(screen.queryByText('Nova imagem do servidor')).not.toBeInTheDocument();

    await user.clear(screen.getByRole('textbox', { name: 'Buscar texto' }));
    await user.click(screen.getByRole('button', { name: 'Mídias' }));
    expect(screen.getByText('Nova imagem do servidor')).toBeInTheDocument();
    expect(screen.queryByText('Planejamento da comunidade roxa')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fixadas' }));
    expect(screen.getByText('Planejamento da comunidade roxa')).toBeInTheDocument();
    expect(screen.queryByText('Nova imagem do servidor')).not.toBeInTheDocument();
  });
});
