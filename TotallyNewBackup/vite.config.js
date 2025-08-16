// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 3000, // Changed from 3000 to avoid conflict and prep for nginx proxy
    strictPort: true,
    allowedHosts: ['.replit.dev'],
    proxy: {
      // Blockchain.info REST (avoid CORS)
      '/api/bci': {
        target: 'https://blockchain.info',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/api\/bci/, ''),
      },
      // Blockchain.info WebSocket (mempool, blocks)
      '/ws/bci': {
        target: 'wss://ws.blockchain.info',
        changeOrigin: true,
        ws: true,
        secure: true,
        rewrite: p => p.replace(/^\/ws\/bci/, ''),
      },
    },
  },
});
