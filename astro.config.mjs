import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yourname.com',
  output: 'static',
  build: {
    format: 'directory',
  },
});
