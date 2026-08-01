import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 600,
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
              name: 'livekit-vendor',
              priority: 15,
              test: /node_modules[\\/](@livekit|livekit-client)/,
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
    watch: {
      ignored: ['**/dist-electron/**', '**/release/**', '**/src-tauri/**'],
    },
  },
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, '**/dist-electron/**', '**/release/**'],
    globals: true,
    maxWorkers: 4,
    setupFiles: './src/test/setup.ts',
  },
});
