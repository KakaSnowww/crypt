import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServerIcon } from './ServerIcon';

describe('ServerIcon com Círculo Arcano', () => {
  it('mostra o nível quando o servidor possui Runas', () => {
    render(<ServerIcon circleColor="#6366F1" circleLevel={2} iconPath={null} name="Crypt Teste" />);

    expect(screen.getByLabelText('Círculo Arcano nível 2')).toBeVisible();
  });

  it('não mostra selo em nível zero', () => {
    render(<ServerIcon iconPath={null} name="Crypt Teste" />);

    expect(screen.queryByLabelText(/Círculo Arcano nível/u)).not.toBeInTheDocument();
  });
});
