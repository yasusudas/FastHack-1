import { defineConfig } from 'vite';

// Local Vite dev: forward /api/* to Express without changing the path.
// Production uses the top-level Vercel service rewrite for the same path.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
