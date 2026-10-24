import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built app also loads from a Capacitor/WebView file origin.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
