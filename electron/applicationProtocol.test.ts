import { describe, expect, it } from 'vitest';
import { applicationScheme, applicationSchemePrivileges } from './applicationProtocol.js';

describe('applicationProtocol', () => {
  it('habilita streaming para áudio e vídeo no protocolo instalado', () => {
    expect(applicationScheme).toBe('crypt-app');
    expect(applicationSchemePrivileges).toMatchObject({
      secure: true,
      standard: true,
      stream: true,
      supportFetchAPI: true,
    });
  });
});
