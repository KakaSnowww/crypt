import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SpotifyEmbed } from './SpotifyEmbed';

describe('SpotifyEmbed', () => {
  it('mostra um estado vazio sem criar iframe', () => {
    render(<SpotifyEmbed title={null} url={null} />);

    expect(screen.getByText('Música favorita não configurada')).toBeVisible();
    expect(screen.queryByTitle(/Spotify Embed/)).not.toBeInTheDocument();
  });

  it('cria somente o player oficial para uma faixa válida', () => {
    render(
      <SpotifyEmbed
        title="Never Gonna Give You Up"
        url="https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"
      />,
    );

    expect(screen.getByTitle('Spotify Embed: Never Gonna Give You Up')).toHaveAttribute(
      'src',
      'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator&theme=0',
    );
  });
});
