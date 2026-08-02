import { useContext } from 'react';
import { AndroidUpdateContext } from './AndroidUpdateContext';

export function useAndroidUpdates() {
  const value = useContext(AndroidUpdateContext);
  if (!value) throw new Error('useAndroidUpdates precisa estar dentro de AndroidUpdateProvider.');
  return value;
}
