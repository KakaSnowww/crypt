import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('desabilita o botão enquanto carrega', () => {
    render(<Button loading>Salvar</Button>);

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('move a luz de interação acompanhando o ponteiro', () => {
    render(<Button>Conectar</Button>);

    const button = screen.getByRole('button', { name: 'Conectar' });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 50,
      height: 40,
      left: 10,
      right: 130,
      toJSON: () => ({}),
      top: 10,
      width: 120,
      x: 10,
      y: 10,
    });

    fireEvent.pointerMove(button, { clientX: 70, clientY: 30 });
    expect(button.style.getPropertyValue('--crypt-pointer-x')).toBe('60px');
    expect(button.style.getPropertyValue('--crypt-pointer-y')).toBe('20px');

    fireEvent.pointerLeave(button);
    expect(button.style.getPropertyValue('--crypt-pointer-x')).toBe('');
    expect(button.style.getPropertyValue('--crypt-pointer-y')).toBe('');
  });
});
