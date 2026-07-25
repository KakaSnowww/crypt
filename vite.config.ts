import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'supabase-vendor',
              priority: 30,
              test: /node_modules[\\/]@supabase/,
            },
            {
              name: 'react-vendor',
              priority: 20,
              test: /node_modules[\\/](react|react-dom|react-router|@tanstack)/,
            },
            {
              name: 'forms-vendor',
              priority: 10,
              test: /node_modules[\\/](@hookform|react-hook-form|zod)/,
            },
          ],
        },
        strictExecutionOrder: true,
      },
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
