import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { AppProviders } from '../app/AppProviders';
import { appRoutes } from '../app/router';
import type { AuthContextValue } from '../features/auth/AuthContext';

const authenticatedUser: User = {
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
  aud: 'authenticated',
  created_at: '2026-07-25T12:00:00.000Z',
  email: 'kaio@example.com',
  id: '10000000-0000-0000-0000-000000000001',
  role: 'authenticated',
  updated_at: '2026-07-25T12:00:00.000Z',
  user_metadata: {
    display_name: 'Kaio Snow',
    handle: 'kaiosnow',
  },
};

const authenticatedSession: Session = {
  access_token: 'test-access-token',
  expires_at: 1_800_000_000,
  expires_in: 3600,
  refresh_token: 'test-refresh-token',
  token_type: 'bearer',
  user: authenticatedUser,
};

export const anonymousAuthValue: AuthContextValue = {
  session: null,
  signOut: () => Promise.resolve(),
  status: 'anonymous',
  user: null,
};

export const authenticatedAuthValue: AuthContextValue = {
  session: authenticatedSession,
  signOut: () => Promise.resolve(),
  status: 'authenticated',
  user: authenticatedUser,
};

export function renderRoute(
  path: string,
  options: {
    authValue?: AuthContextValue;
  } = {},
) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [path],
  });

  return {
    router,
    ...render(
      <AppProviders authValue={options.authValue ?? anonymousAuthValue}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}
