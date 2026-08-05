import { afterEach, describe, expect, it, vi } from 'vitest';
import { openArcanaCheckout } from './arcanaBilling.service';

describe('checkout Arcana pelo Asaas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aceita somente HTTPS oficial do Asaas', () => {
    const append = vi.spyOn(document.body, 'append');
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    expect(() =>
      openArcanaCheckout('https://sandbox.asaas.com/checkoutSession/show/abc'),
    ).not.toThrow();

    expect(append).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it('recusa domínio parecido e credenciais embutidas', () => {
    expect(() => openArcanaCheckout('https://sandbox.asaas.com.evil.test/checkout')).toThrow();

    expect(() => openArcanaCheckout('https://usuario:senha@sandbox.asaas.com/checkout')).toThrow();
  });
});
