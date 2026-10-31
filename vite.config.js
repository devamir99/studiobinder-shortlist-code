import { defineConfig } from 'vite';

// base: './' → خروجی روی هر مسیری (مثلاً GitHub Pages زیر /repo-name/) درست کار می‌کند
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
});
