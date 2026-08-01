import { describe, expect, it } from 'vitest';
import { hasMissingPermissions } from './androidPermissions';

describe('hasMissingPermissions', () => {
  it('reconhece quando todos os recursos do Android estão permitidos', () => {
    expect(
      hasMissingPermissions({
        bluetooth: 'granted',
        camera: 'granted',
        microphone: 'granted',
        notifications: 'granted',
      }),
    ).toBe(false);
  });

  it('mantém a orientação aberta quando algum recurso está pendente', () => {
    expect(
      hasMissingPermissions({
        bluetooth: 'granted',
        camera: 'prompt',
        microphone: 'granted',
        notifications: 'denied',
      }),
    ).toBe(true);
  });
});
