import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Purpose: Local development proxy for SportMonks API.
 * Why: Browser calls to the direct API fail with CORS, so dev traffic is routed through Vite.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/sportmonks': {
        target: 'https://cricket.sportmonks.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/sportmonks/, '/api/v2.0'),
      },
    },
  },
});
