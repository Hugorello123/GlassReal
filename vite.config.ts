import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://sentotrade.io:8443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'https://sentotrade.io:8443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
