// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        'lucide-react': 'lucide-react/dist/cjs/lucide-react.js'
      }
    }
  },
  integrations: [react()]
});
