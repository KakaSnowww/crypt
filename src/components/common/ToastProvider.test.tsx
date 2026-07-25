import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { authenticatedAuthValue, renderRoute } from '../../test/renderRoute';

describe('ToastProvider', () => {
  it('anuncia uma notificação de sucesso', async () => {
    const user = userEvent.setup();
    renderRoute('/app/componentes', { authValue: authenticatedAuthValue });

    await user.click(await screen.findByRole('button', { name: 'Mostrar sucesso' }));

    const toast = screen.getByText('Tudo certo').closest('[role="status"]');

    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('As preferências visuais foram atualizadas.');
  });
});
