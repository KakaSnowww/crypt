import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { ToastProvider } from '../components/common/ToastProvider';
import { AuthContext, type AuthContextValue } from '../features/auth/AuthContext';
import { AuthProvider } from '../features/auth/AuthProvider';

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
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  ) : (
    <AuthProvider>{children}</AuthProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{authContent}</ToastProvider>
    </QueryClientProvider>
  );
}
