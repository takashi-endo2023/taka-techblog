import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';

export default defineConfig({
  site: 'https://taka-techblog.com',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap(),
    mdx(),
    partytown({
      config: {
        forward: ['dataLayer.push', 'gtag'],
      },
    }),
  ],
});
