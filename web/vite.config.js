import { defineConfig } from 'vite';

// /api/* in the browser -> http://localhost:3000/* on the Express server,
// so /api/translate reaches the server's POST /translate.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
