import { z } from 'zod';

const publicEnvironmentSchema = z.object({
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(20),
  VITE_SUPABASE_URL: z.url(),
});

const parsedEnvironment = publicEnvironmentSchema.safeParse({
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
});

export const publicEnvironment = parsedEnvironment.success ? parsedEnvironment.data : null;

export const supabaseConfigurationMessage =
  'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local.';
