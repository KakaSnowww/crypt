import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { InterestCategoryWithItems } from '../profile.types';
import { InterestSelector } from './InterestSelector';

const category: InterestCategoryWithItems = {
  description: 'Sons que fazem parte do seu dia.',
  id: 1,
  interests: [
    { category_id: 1, id: 10, label: 'Rock', slug: 'rock', sort_order: 1 },
    { category_id: 1, id: 11, label: 'MPB', slug: 'mpb', sort_order: 2 },
  ],
  label: 'Música',
  slug: 'musica',
  sort_order: 1,
};

describe('InterestSelector', () => {
  it('anuncia a seleção e devolve a lista atualizada', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<InterestSelector category={category} onChange={onChange} selectedInterestIds={[10]} />);

    expect(screen.getByRole('button', { name: 'Rock' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'MPB' }));

    expect(onChange).toHaveBeenCalledWith([10, 11]);
  });
});
