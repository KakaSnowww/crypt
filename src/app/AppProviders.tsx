import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { ToastProvider } from '../components/common/ToastProvider';
import { AuthContext, type AuthContextValue } from '../features/auth/AuthContext';
import { AuthProvider } from '../features/auth/AuthProvider';
import { MobileNetworkStatus } from '../features/mobile/MobileNetworkStatus';
import { AndroidPermissionsPrompt } from '../features/mobile/AndroidPermissionsPrompt';
import { DesktopUpdateBanner } from '../features/desktopUpdates/DesktopUpdateBanner';
import { DesktopStartupSound } from '../features/desktopUpdates/DesktopStartupSound';
import { PostUpdateWhatsNew } from '../features/desktopUpdates/PostUpdateWhatsNew';
import { AndroidPushRegistration } from '../features/notifications/AndroidPushRegistration';
import { AndroidUpdateProvider } from '../features/androidUpdates/AndroidUpdateProvider';
import { VoiceCallProvider } from '../features/voice/VoiceCallProvider';

type AppProvidersProps = PropsWithChildren<{
  authValue?: AuthContextValue;
}>;

export function AppProviders({ authValue, children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnReconnect: true,
            retry: 1,
            retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
            staleTime: 30_000,
          },
        },
      }),
  );

  const authContent = authValue ? (
    <AuthContext.Provider value={authValue}>
      <AndroidPushRegistration />
      <VoiceCallProvider>{children}</VoiceCallProvider>
    </AuthContext.Provider>
  ) : (
    <AuthProvider>
      <AndroidPushRegistration />
      <VoiceCallProvider>{children}</VoiceCallProvider>
    </AuthProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AndroidUpdateProvider>
          <MobileNetworkStatus />
          <AndroidPermissionsPrompt />
          <DesktopStartupSound />
          <DesktopUpdateBanner />
          <PostUpdateWhatsNew />
          {authContent}
        </AndroidUpdateProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
