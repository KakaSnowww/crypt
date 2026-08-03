import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../../../app/AppProviders';
import { authenticatedAuthValue } from '../../../test/renderRoute';
import type * as ProfileServiceModule from '../profile.service';
import type { Profile } from '../profile.types';
import { AvatarEditor } from './AvatarEditor';

const { uploadAvatarMock } = vi.hoisted(() => ({
  uploadAvatarMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../profile.service', async (importOriginal) => {
  const original = await importOriginal<typeof ProfileServiceModule>();

  return {
    ...original,
    uploadAvatar: uploadAvatarMock,
  };
});

const profile: Profile = {
  avatar_path: null,
  banner_path: null,
  bio: null,
  created_at: '2026-07-25T12:00:00.000Z',
  display_name: 'Kaio Snow',
  favorite_spotify_thumbnail_url: null,
  favorite_spotify_title: null,
  favorite_spotify_url: null,
  handle: 'kaiosnow',
  id: '10000000-0000-0000-0000-000000000001',
  profile_effect: 'none',
  updated_at: '2026-07-25T12:00:00.000Z',
};

afterEach(() => {
  uploadAvatarMock.mockClear();
  vi.unstubAllGlobals();
});

describe('AvatarEditor', () => {
  it('permite conferir e salvar um GIF como avatar', async () => {
    const createObjectUrl = vi.fn(() => 'blob:avatar-preview');
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        public static createObjectURL = createObjectUrl;
        public static revokeObjectURL = revokeObjectUrl;
      },
    );
    const user = userEvent.setup();
    const onBusyChange = vi.fn();

    render(
      <AppProviders authValue={authenticatedAuthValue}>
        <AvatarEditor onBusyChange={onBusyChange} profile={profile} />
      </AppProviders>,
    );

    const image = new File(['avatar'], 'avatar.gif', { type: 'image/gif' });
    await user.upload(screen.getByLabelText('Escolher imagem'), image);
    expect(screen.getByText(/O GIF será preservado com animação/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Salvar enquadramento' }));

    await waitFor(() =>
      expect(uploadAvatarMock).toHaveBeenCalledWith(
        '10000000-0000-0000-0000-000000000001',
        image,
        null,
      ),
    );
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));

    expect(onBusyChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('Avatar atualizado')).toBeVisible();
  });
});
