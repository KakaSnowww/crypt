import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { publicEnvironment, supabaseConfigurationMessage } from '../config/env';

let browserClient: SupabaseClient<Database> | undefined;

export class SupabaseConfigurationError extends Error {
  public constructor() {
    super(supabaseConfigurationMessage);
    this.name = 'SupabaseConfigurationError';
  }
}

export function isSupabaseConfigured() {
  return publicEnvironment !== null;
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!publicEnvironment) {
    throw new SupabaseConfigurationError();
  }

  browserClient ??= createClient<Database>(
    publicEnvironment.VITE_SUPABASE_URL,
    publicEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        persistSession: true,
        storageKey: 'crypt.auth.session',
      },
    },
  );

  return browserClient;
}
