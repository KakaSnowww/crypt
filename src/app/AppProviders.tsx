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
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  const authContent = authValue ? (
    <AuthContext.Provider value={authValue}>
      <VoiceCallProvider>{children}</VoiceCallProvider>
    </AuthContext.Provider>
  ) : (
    <AuthProvider>
      <VoiceCallProvider>{children}</VoiceCallProvider>
    </AuthProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MobileNetworkStatus />
        <AndroidPermissionsPrompt />
        <DesktopStartupSound />
        <DesktopUpdateBanner />
        <PostUpdateWhatsNew />
        {authContent}
      </ToastProvider>
    </QueryClientProvider>
  );
}
