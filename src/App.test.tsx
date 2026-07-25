import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('apresenta o nome e o estado inicial do Crypt', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /seu espaço para conversar/i }),
    ).toBeVisible();
    expect(screen.getByText('Fase 1 concluída')).toBeVisible();
    expect(screen.getByText('Base pronta para evoluir')).toBeVisible();
  });
});
