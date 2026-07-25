import type { ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { getSafeNextPath } from './auth.service';
import { useAuth } from './useAuth';

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'authenticated') {
    return <Navigate replace to={getSafeNextPath(searchParams.get('next'))} />;
  }

  return children;
}
