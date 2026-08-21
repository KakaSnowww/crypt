import { createContext } from 'react';

export type AuthExperiencePhase = 'error' | 'focused' | 'idle' | 'loading' | 'verified';

export type AuthExperienceValue = {
  phase: AuthExperiencePhase;
  setPhase: (phase: AuthExperiencePhase) => void;
};

export const AuthExperienceContext = createContext<AuthExperienceValue | null>(null);
