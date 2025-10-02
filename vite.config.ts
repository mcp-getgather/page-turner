import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    assetsDir: 'static-assets',
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    allowedHosts: true,
  },
});
