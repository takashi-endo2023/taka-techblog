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
    sitemap({
      // noindex にした一覧ページ（タグ全ページ・ブログ2ページ目以降）はサイトマップからも除外。
      // 「sitemap=index推奨」と「meta robots=noindex」の矛盾シグナルを避け、クロール予算を記事本体に集中させる。
      // /blog/1（一覧トップ）と記事本体は残す。
      filter: (page) =>
        !page.includes('/blog/tags/') &&
        !/\/blog\/(?!1\/?$)\d+\/?$/.test(page),
    }),
    mdx(),
  ],
});
