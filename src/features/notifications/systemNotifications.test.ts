import { describe, expect, it } from 'vitest';
import { notificationIdFromString } from './systemNotifications';

describe('notificações nativas', () => {
  it('gera um identificador Android estável e válido', () => {
    const value = '60000000-0000-0000-0000-000000000001';
    const id = notificationIdFromString(value);

    expect(notificationIdFromString(value)).toBe(id);
    expect(id).toBeGreaterThan(0);
    expect(id).toBeLessThanOrEqual(2_147_483_647);
  });
});
