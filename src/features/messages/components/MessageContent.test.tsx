import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MessageContent } from './MessageContent';

vi.mock('../../servers/servers.queries', () => ({
  useServerInvitePreview: () => ({
    data: {
      already_member: false,
      banner_path: 'servers/banner.webp',
      icon_path: null,
      member_count: 12,
      owner_display_name: 'Kaio Snow',
      remaining_uses: null,
      server_description: 'Comunidade arcana de teste.',
      server_id: '70000000-0000-0000-0000-000000000001',
      server_name: 'Cripta Arcana',
    },
    error: null,
    isPending: false,
  }),
}));

vi.mock('../../servers/servers.service', () => ({
  getServerMediaUrl: (path: null | string) => (path ? `https://cdn.example/${path}` : null),
}));

describe('MessageContent', () => {
  it('transforma links seguros em links clicáveis sem usar HTML bruto', () => {
    render(
      <MemoryRouter>
        <MessageContent content="Veja https://example.com/guia e www.example.org agora." />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'https://example.com/guia' })).toHaveAttribute(
      'href',
      'https://example.com/guia',
    );
    expect(screen.getByRole('link', { name: 'www.example.org' })).toHaveAttribute(
      'href',
      'https://www.example.org/',
    );
  });

  it('mantém protocolos perigosos como texto comum', () => {
    render(
      <MemoryRouter>
        <MessageContent content="javascript:alert(1)" />
      </MemoryRouter>,
    );

    expect(screen.getByText('javascript:alert(1)')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('substitui o convite crypt puro pelo embed do servidor', () => {
    render(
      <MemoryRouter>
        <MessageContent content="crypt://invite/8acad6c84a88c277ff126ca056616d1476d1" />
      </MemoryRouter>,
    );

    expect(
      screen.queryByText('crypt://invite/8acad6c84a88c277ff126ca056616d1476d1'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cripta Arcana' })).toBeVisible();
    expect(screen.getByText('Comunidade arcana de teste.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir para o servidor' })).toHaveAttribute(
      'href',
      '/app/convite/8acad6c84a88c277ff126ca056616d1476d1',
    );
  });

  it('também reconhece o código hexadecimal puro', () => {
    render(
      <MemoryRouter>
        <MessageContent content="8acad6c84a88c277ff126ca056616d1476d1" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Cripta Arcana' })).toBeVisible();
  });
});
