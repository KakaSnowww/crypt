import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { RouteErrorFallback } from '../routes/RouteErrorFallback';
import { OnboardingGate } from '../features/onboarding/OnboardingGate';
import { ServerOnboardingGate } from '../features/server-onboarding/ServerOnboardingGate';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { PublicOnlyRoute } from '../features/auth/PublicOnlyRoute';
import {
  AccountSecurityRoute,
  ArcanaRoute,
  AppHomeRoute,
  AppShell,
  AuthCallbackRoute,
  ChannelRoute,
  ConnectionsRoute,
  ConnectedAccountsRoute,
  DesignSystemRoute,
  DirectConversationRoute,
  DirectMessagesRoute,
  ForgotPasswordRoute,
  GlobalSearchRoute,
  LazyRoute,
  LoginRoute,
  NotFoundRoute,
  NotificationsRoute,
  OnboardingRoute,
  ProfileRoute,
  ProfileSettingsRoute,
  PublicProfileRoute,
  RegisterRoute,
  ResetPasswordRoute,
  ServerInviteRoute,
  ServerOnboardingRoute,
  ServerOpenRoute,
  ServerManageRoute,
  ServerModerationRoute,
  ServerRoute,
  ServersRoute,
  ServerSettingsRoute,
  VoiceRoomRoute,
} from './lazyRoutes';

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate replace to="/app" />,
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        path: '/login',
        element: (
          <PublicOnlyRoute>
            <LazyRoute>
              <LoginRoute />
            </LazyRoute>
          </PublicOnlyRoute>
        ),
      },
      {
        path: '/cadastro',
        element: (
          <PublicOnlyRoute>
            <LazyRoute>
              <RegisterRoute />
            </LazyRoute>
          </PublicOnlyRoute>
        ),
      },
      {
        path: '/recuperar-senha',
        element: (
          <PublicOnlyRoute>
            <LazyRoute>
              <ForgotPasswordRoute />
            </LazyRoute>
          </PublicOnlyRoute>
        ),
      },
      {
        path: '/redefinir-senha',
        element: (
          <LazyRoute>
            <ResetPasswordRoute />
          </LazyRoute>
        ),
      },
      {
        path: '/auth/callback',
        element: (
          <LazyRoute>
            <AuthCallbackRoute />
          </LazyRoute>
        ),
      },
    ],
  },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <OnboardingRoute />
        </LazyRoute>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <OnboardingGate>
          <LazyRoute>
            <AppShell />
          </LazyRoute>
        </OnboardingGate>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      {
        path: 'arcana',
        element: (
          <LazyRoute>
            <ArcanaRoute />
          </LazyRoute>
        ),
      },
      {
        index: true,
        element: (
          <LazyRoute>
            <AppHomeRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'componentes',
        element: (
          <LazyRoute>
            <DesignSystemRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'conexoes',
        element: (
          <LazyRoute>
            <ConnectionsRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'configuracoes/conexoes',
        element: (
          <LazyRoute>
            <ConnectedAccountsRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'busca',
        element: (
          <LazyRoute>
            <GlobalSearchRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'mensagens',
        element: (
          <LazyRoute>
            <DirectMessagesRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'mensagens/:conversationId',
        element: (
          <LazyRoute>
            <DirectConversationRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'notificacoes',
        element: (
          <LazyRoute>
            <NotificationsRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'perfil',
        element: (
          <LazyRoute>
            <ProfileRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'servidores',
        element: (
          <LazyRoute>
            <ServersRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'servidores/:serverId/abrir',
        element: (
          <ServerOnboardingGate>
            <LazyRoute>
              <ServerOpenRoute />
            </LazyRoute>
          </ServerOnboardingGate>
        ),
      },
      {
        path: 'servidores/:serverId',
        element: (
          <ServerOnboardingGate>
            <LazyRoute>
              <ServerRoute />
            </LazyRoute>
          </ServerOnboardingGate>
        ),
      },
      {
        path: 'servidores/:serverId/entrada',
        element: (
          <LazyRoute>
            <ServerOnboardingRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'servidores/:serverId/configuracoes',
        element: (
          <LazyRoute>
            <ServerSettingsRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'servidores/:serverId/gerenciar',
        element: (
          <LazyRoute>
            <ServerManageRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'servidores/:serverId/moderacao',
        element: (
          <LazyRoute>
            <ServerModerationRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'servidores/:serverId/canais/:channelId',
        element: (
          <ServerOnboardingGate>
            <LazyRoute>
              <ChannelRoute />
            </LazyRoute>
          </ServerOnboardingGate>
        ),
      },
      {
        path: 'servidores/:serverId/chamadas/:channelId',
        element: (
          <ServerOnboardingGate>
            <LazyRoute>
              <VoiceRoomRoute />
            </LazyRoute>
          </ServerOnboardingGate>
        ),
      },
      {
        path: 'convite/:code',
        element: (
          <LazyRoute>
            <ServerInviteRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'perfil/editar',
        element: (
          <LazyRoute>
            <ProfileSettingsRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'pessoas/:handle',
        element: (
          <LazyRoute>
            <PublicProfileRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'conta',
        element: (
          <LazyRoute>
            <AccountSecurityRoute />
          </LazyRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <LazyRoute>
        <NotFoundRoute />
      </LazyRoute>
    ),
  },
];

export const router = createBrowserRouter(appRoutes);
