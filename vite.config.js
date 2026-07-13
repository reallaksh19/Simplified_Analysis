import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const buildTime = new Date().toISOString();

export default defineConfig({
  base: '/Simplified_Analysis/',
  plugins: [tailwindcss()],
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    watch: {
      ignored: ['**/benchmarks/**', '**/reports/**'],
    },
  },
});
