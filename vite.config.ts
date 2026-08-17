import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: { outDir: 'dist', target: 'es2020', assetsInlineLimit: 0 },
});
