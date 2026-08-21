import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileAvatar } from './ProfileAvatar';

describe('ProfileAvatar', () => {
  it('mantém a foto e as iniciais dentro de uma máscara circular', () => {
    render(<ProfileAvatar avatarPath={null} displayName="Kaio Snow" size="lg" />);

    expect(screen.getByLabelText('Iniciais de Kaio Snow').parentElement).toHaveClass(
      'rounded-full',
    );
  });
});
