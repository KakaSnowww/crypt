import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('expõe o estado e solicita a troca pelo switch', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Toggle
        checked={false}
        description="Atualiza sua preferência."
        label="Mostrar atividade"
        onChange={onChange}
      />,
    );

    const control = screen.getByRole('switch', { name: 'Mostrar atividade' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    expect(control.querySelector('.crypt-toggle__thumb')).not.toBeNull();

    await user.click(control);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('não permite alteração quando está desabilitado', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Toggle
        checked
        description="Preferência bloqueada."
        disabled
        label="Mostrar no perfil"
        onChange={onChange}
      />,
    );

    const control = screen.getByRole('switch', { name: 'Mostrar no perfil' });
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-checked', 'true');
    await user.click(control);
    expect(onChange).not.toHaveBeenCalled();
  });
});
