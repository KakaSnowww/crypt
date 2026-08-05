import { lazy, Suspense, type ReactNode } from 'react';
import { Spinner } from '../components/common/Spinner';

export const AccountSecurityRoute = lazy(async () => {
  const route = await import('../routes/AccountSecurityRoute');
  return { default: route.AccountSecurityRoute };
});
export const ArcanaRoute = lazy(async () => {
  const route = await import('../routes/ArcanaRoute');
  return { default: route.ArcanaRoute };
});

export const AppHomeRoute = lazy(async () => {
  const route = await import('../routes/AppHomeRoute');
  return { default: route.AppHomeRoute };
});

export const AppShell = lazy(async () => {
  const layout = await import('../components/layout/AppShell');
  return { default: layout.AppShell };
});

export const AuthCallbackRoute = lazy(async () => {
  const route = await import('../routes/AuthCallbackRoute');
  return { default: route.AuthCallbackRoute };
});

export const DesignSystemRoute = lazy(async () => {
  const route = await import('../routes/DesignSystemRoute');
  return { default: route.DesignSystemRoute };
});

export const DirectConversationRoute = lazy(async () => {
  const route = await import('../routes/DirectConversationRoute');
  return { default: route.DirectConversationRoute };
});

export const DirectMessagesRoute = lazy(async () => {
  const route = await import('../routes/DirectMessagesRoute');
  return { default: route.DirectMessagesRoute };
});

export const ConnectionsRoute = lazy(async () => {
  const route = await import('../routes/ConnectionsRoute');
  return { default: route.ConnectionsRoute };
});
export const ConnectedAccountsRoute = lazy(async () => {
  const route = await import('../routes/ConnectedAccountsRoute');
  return { default: route.ConnectedAccountsRoute };
});

export const ChannelRoute = lazy(async () => {
  const route = await import('../routes/ChannelRoute');
  return { default: route.ChannelRoute };
});

export const ForgotPasswordRoute = lazy(async () => {
  const route = await import('../routes/ForgotPasswordRoute');
  return { default: route.ForgotPasswordRoute };
});
export const GlobalSearchRoute = lazy(async () => {
  const route = await import('../routes/GlobalSearchRoute');
  return { default: route.GlobalSearchRoute };
});

export const LoginRoute = lazy(async () => {
  const route = await import('../routes/LoginRoute');
  return { default: route.LoginRoute };
});

export const OnboardingRoute = lazy(async () => {
  const route = await import('../routes/OnboardingRoute');
  return { default: route.OnboardingRoute };
});

export const NotFoundRoute = lazy(async () => {
  const route = await import('../routes/NotFoundRoute');
  return { default: route.NotFoundRoute };
});

export const NotificationsRoute = lazy(async () => {
  const route = await import('../routes/NotificationsRoute');
  return { default: route.NotificationsRoute };
});

export const ProfileRoute = lazy(async () => {
  const route = await import('../routes/ProfileRoute');
  return { default: route.ProfileRoute };
});

export const ProfileSettingsRoute = lazy(async () => {
  const route = await import('../routes/ProfileSettingsRoute');
  return { default: route.ProfileSettingsRoute };
});

export const PublicProfileRoute = lazy(async () => {
  const route = await import('../routes/PublicProfileRoute');
  return { default: route.PublicProfileRoute };
});

export const RegisterRoute = lazy(async () => {
  const route = await import('../routes/RegisterRoute');
  return { default: route.RegisterRoute };
});

export const ResetPasswordRoute = lazy(async () => {
  const route = await import('../routes/ResetPasswordRoute');
  return { default: route.ResetPasswordRoute };
});

export const ServerInviteRoute = lazy(async () => {
  const route = await import('../routes/ServerInviteRoute');
  return { default: route.ServerInviteRoute };
});

export const ServerOnboardingRoute = lazy(async () => {
  const route = await import('../routes/ServerOnboardingRoute');
  return { default: route.ServerOnboardingRoute };
});

export const ServerOpenRoute = lazy(async () => {
  const route = await import('../routes/ServerOpenRoute');
  return { default: route.ServerOpenRoute };
});

export const ServerRoute = lazy(async () => {
  const route = await import('../routes/ServerRoute');
  return { default: route.ServerRoute };
});

export const ServersRoute = lazy(async () => {
  const route = await import('../routes/ServersRoute');
  return { default: route.ServersRoute };
});

export const ServerSettingsRoute = lazy(async () => {
  const route = await import('../routes/ServerSettingsRoute');
  return { default: route.ServerSettingsRoute };
});

export const ServerManageRoute = lazy(async () => {
  const route = await import('../routes/ServerManageRoute');
  return { default: route.ServerManageRoute };
});

export const ServerModerationRoute = lazy(async () => {
  const route = await import('../routes/ServerModerationRoute');
  return { default: route.ServerModerationRoute };
});

export const VoiceRoomRoute = lazy(async () => {
  const route = await import('../routes/VoiceRoomRoute');
  return { default: route.VoiceRoomRoute };
});

export function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          aria-label="Carregando página"
          aria-live="polite"
          className="grid min-h-32 place-items-center text-crypt-muted"
        >
          <Spinner />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
