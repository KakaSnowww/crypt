import { useMemo, useState, type ReactNode } from 'react';
import { AuthExperienceContext, type AuthExperiencePhase } from './authExperience.context';

export function AuthExperienceProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthExperiencePhase>('idle');
  const value = useMemo(() => ({ phase, setPhase }), [phase]);

  return <AuthExperienceContext.Provider value={value}>{children}</AuthExperienceContext.Provider>;
}
