import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('associa o erro ao campo de maneira acessível', () => {
    render(<Input errorText="Campo obrigatório." label="Nome" />);

    const input = screen.getByRole('textbox', { name: 'Nome' });
    const error = screen.getByText('Campo obrigatório.');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Campo obrigatório.');
    expect(error).toBeVisible();
  });
});
