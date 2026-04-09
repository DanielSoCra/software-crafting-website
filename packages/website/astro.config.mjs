// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), sitemap()],
  vite: {
    envDir: fileURLToPath(new URL('../..', import.meta.url)),
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  site: 'https://software-crafting.de',
});