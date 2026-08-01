import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('abre, anuncia o título e fecha com Escape', async () => {
    const user = userEvent.setup();
    render(<ModalTestHarness />);

    await user.click(screen.getByRole('button', { name: 'Abrir modal' }));

    expect(screen.getByRole('dialog', { name: 'Confirmar demonstração' })).toBeVisible();

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', { name: 'Confirmar demonstração' }),
    ).not.toBeInTheDocument();
  });
});

function ModalTestHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Abrir modal
      </button>
      <Modal onOpenChange={setOpen} open={open} title="Confirmar demonstração">
        Conteúdo da demonstração
      </Modal>
    </>
  );
}
