import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to backend
      '/api': {
        target: 'http://localhost:5177',
        changeOrigin: true,
      },
      // Proxy webhook requests to backend
      '/webhook': {
        target: 'http://localhost:5177',
        changeOrigin: true,
      },
      // Proxy config requests to backend
      '/config': {
        target: 'http://localhost:5177',
        changeOrigin: true,
      },
    },
  },
});
