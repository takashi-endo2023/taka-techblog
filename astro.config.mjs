import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://taka-techblog.com',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
});
