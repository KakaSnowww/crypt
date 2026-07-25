import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { authenticatedAuthValue, renderRoute } from '../../test/renderRoute';

describe('Modal', () => {
  it('abre, anuncia o título e fecha com Escape', async () => {
    const user = userEvent.setup();
    renderRoute('/app/componentes', { authValue: authenticatedAuthValue });

    await user.click(await screen.findByRole('button', { name: 'Abrir modal' }));

    expect(screen.getByRole('dialog', { name: 'Confirmar demonstração' })).toBeVisible();

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', { name: 'Confirmar demonstração' }),
    ).not.toBeInTheDocument();
  });
});
