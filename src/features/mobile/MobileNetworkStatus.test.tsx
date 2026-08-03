import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MobileNetworkStatus } from './MobileNetworkStatus';

afterEach(() => {
  act(() => window.dispatchEvent(new Event('online')));
});

describe('MobileNetworkStatus', () => {
  it('avisa sobre perda de internet e desaparece após reconectar', () => {
    render(<MobileNetworkStatus />);

    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status')).toHaveTextContent('o Crypt reconectará automaticamente');

    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
