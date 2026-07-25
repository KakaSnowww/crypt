import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type AuthStatus = 'anonymous' | 'authenticated' | 'loading' | 'unconfigured';

export type AuthContextValue = {
  session: null | Session;
  signOut: () => Promise<void>;
  status: AuthStatus;
  user: null | User;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
