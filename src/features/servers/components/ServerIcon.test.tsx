import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServerIcon } from './ServerIcon';

describe('ServerIcon com Boost', () => {
  it('mostra o nível quando o servidor possui Boosts', () => {
    render(<ServerIcon circleColor="#6366F1" circleLevel={2} iconPath={null} name="Crypt Teste" />);

    expect(screen.getByLabelText('Boost do servidor nível 2')).toBeVisible();
  });

  it('não mostra selo em nível zero', () => {
    const { container } = render(<ServerIcon iconPath={null} name="Crypt Teste" />);

    expect(screen.queryByLabelText(/Boost do servidor nível/u)).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('rounded-full');
  });
});
