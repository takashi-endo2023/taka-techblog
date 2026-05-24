import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://www.taka-techblog.com',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap(),
    mdx(),
  ],
});
