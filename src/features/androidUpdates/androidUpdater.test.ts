import { describe, expect, it } from 'vitest';
import { isNewerVersion, parseAndroidRelease } from './androidUpdater';

describe('atualizações Android', () => {
  it('compara versões sem confundir números com texto', () => {
    expect(isNewerVersion('0.4.0', '0.3.9')).toBe(true);
    expect(isNewerVersion('0.4.0', '0.4.0')).toBe(false);
    expect(isNewerVersion('0.3.10', '0.4.0')).toBe(false);
  });

  it('aceita somente o APK oficial e exato da versão', () => {
    expect(
      parseAndroidRelease({
        assets: [
          {
            browser_download_url:
              'https://github.com/KakaSnowww/crypt/releases/download/v0.4.0/Crypt-Android-0.4.0.apk',
            name: 'Crypt-Android-0.4.0.apk',
          },
        ],
        body: '- Atualização Android',
        draft: false,
        name: 'Crypt v0.4.0',
        prerelease: false,
        tag_name: 'v0.4.0',
      }),
    ).toEqual({
      apkUrl:
        'https://github.com/KakaSnowww/crypt/releases/download/v0.4.0/Crypt-Android-0.4.0.apk',
      name: 'Crypt v0.4.0',
      notes: '- Atualização Android',
      version: '0.4.0',
    });
  });

  it('recusa um APK hospedado fora do repositório oficial', () => {
    expect(() =>
      parseAndroidRelease({
        assets: [
          {
            browser_download_url: 'https://example.com/Crypt-Android-0.4.0.apk',
            name: 'Crypt-Android-0.4.0.apk',
          },
        ],
        draft: false,
        prerelease: false,
        tag_name: 'v0.4.0',
      }),
    ).toThrow('ainda não contém o APK oficial');
  });
});
