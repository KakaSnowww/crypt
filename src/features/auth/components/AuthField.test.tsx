import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyRound } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { AuthField } from './AuthField';

describe('AuthField', () => {
  it('revela a senha sem perder a associação acessível do campo', async () => {
    const user = userEvent.setup();
    render(
      <AuthField errorText="Revise sua senha." icon={<KeyRound />} label="Senha" type="password" />,
    );

    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAccessibleDescription('Revise sua senha.');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeVisible();
  });
});
