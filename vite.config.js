import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages project site needs the repo base path in production builds only
  base: command === 'build' ? '/Cozy_Town/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    host: true,
    port: 3000,
  },
}));
