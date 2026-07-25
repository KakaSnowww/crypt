import type { PropsWithChildren } from 'react';
import { ToastProvider } from '../components/common/ToastProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return <ToastProvider>{children}</ToastProvider>;
}
