import { useContext } from 'react';
import { AuthExperienceContext } from './authExperience.context';

export function useAuthExperience() {
  const context = useContext(AuthExperienceContext);

  if (!context) {
    throw new Error('useAuthExperience precisa estar dentro de AuthExperienceProvider.');
  }

  return context;
}

export function waitForAuthTransition(duration = 520) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}
