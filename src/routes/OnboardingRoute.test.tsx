import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../app/AppProviders';
import type * as ProfileServiceModule from '../features/profile/profile.service';
import { authenticatedAuthValue } from '../test/renderRoute';
import { OnboardingRoute } from './OnboardingRoute';

const { saveOnboardingStepMock } = vi.hoisted(() => ({
  saveOnboardingStepMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../features/profile/profile.queries', () => ({
  profileKeys: {
    current: (id: string) => ['profile', 'current', id],
    selections: (id: string) => ['profile', 'selections', id],
    settings: (id: string) => ['profile', 'settings', id],
  },
  useCurrentProfile: () => ({
    data: {
      avatar_path: null,
      bio: null,
      created_at: '2026-07-25T12:00:00.000Z',
      display_name: 'Kaio Snow',
      favorite_spotify_thumbnail_url: null,
      favorite_spotify_title: null,
      favorite_spotify_url: null,
      handle: 'kaiosnow',
      id: '10000000-0000-0000-0000-000000000001',
      updated_at: '2026-07-25T12:00:00.000Z',
    },
    error: null,
    isPending: false,
  }),
  useInterestCatalog: () => ({
    data: [],
    error: null,
    isPending: false,
  }),
  useProfileSettings: () => ({
    data: {
      allow_direct_messages: true,
      allow_friend_requests: true,
      created_at: '2026-07-25T12:00:00.000Z',
      discoverable_by_search: true,
      hide_all_interests: false,
      onboarding_completed_at: null,
      onboarding_step: 0,
      profile_id: '10000000-0000-0000-0000-000000000001',
      show_interests_on_profile: false,
      show_mutual_friends: true,
      show_mutual_servers: true,
      show_online_status: true,
      updated_at: '2026-07-25T12:00:00.000Z',
      use_interests_for_suggestions: false,
    },
    error: null,
    isPending: false,
  }),
  useSelectedInterestIds: () => ({
    data: [],
    error: null,
    isPending: false,
  }),
}));

vi.mock('../features/profile/profile.service', async (importOriginal) => {
  const original = await importOriginal<typeof ProfileServiceModule>();

  return {
    ...original,
    saveOnboardingStep: saveOnboardingStepMock,
  };
});

describe('OnboardingRoute', () => {
  it('explica a opcionalidade e persiste o avanço', async () => {
    const user = userEvent.setup();

    renderOnboarding();

    expect(
      screen.getByRole('heading', { name: 'Vamos deixar seu espaço com a sua cara' }),
    ).toBeVisible();
    expect(screen.getByText(/Interesses, biografia, avatar e música são opcionais/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Começar' }));

    expect(saveOnboardingStepMock).toHaveBeenCalledWith('10000000-0000-0000-0000-000000000001', 1);
    expect(await screen.findByRole('heading', { name: 'Como você quer aparecer?' })).toBeVisible();
  });
});

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <AppProviders authValue={authenticatedAuthValue}>
        <OnboardingRoute />
      </AppProviders>
    </MemoryRouter>,
  );
}
