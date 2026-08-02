import { createContext } from 'react';
import type { AndroidUpdateState } from './androidUpdater';

export type AndroidUpdateContextValue = {
  check: () => Promise<void>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  state: AndroidUpdateState;
};

export const AndroidUpdateContext = createContext<AndroidUpdateContextValue | null>(null);
