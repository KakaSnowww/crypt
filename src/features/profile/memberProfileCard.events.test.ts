import { describe, expect, it, vi } from 'vitest';
import { memberProfileCardEvent, openMemberProfileCard } from './memberProfileCard.events';

describe('openMemberProfileCard', () => {
  it('normaliza o identificador e dispara o cartão global', () => {
    const listener = vi.fn();
    window.addEventListener(memberProfileCardEvent, listener);

    expect(openMemberProfileCard('@Kaio_Snow')).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    const event = listener.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail).toEqual({ handle: 'kaio_snow' });

    window.removeEventListener(memberProfileCardEvent, listener);
  });

  it('recusa identificadores inválidos', () => {
    const listener = vi.fn();
    window.addEventListener(memberProfileCardEvent, listener);

    expect(openMemberProfileCard('!')).toBe(false);
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(memberProfileCardEvent, listener);
  });
});
