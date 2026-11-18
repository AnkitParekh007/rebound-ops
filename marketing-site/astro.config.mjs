// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * SITE_URL is the absolute origin the site is served from (no trailing slash), for example
 * https://www.example.org. It feeds canonicals, the sitemap, Open Graph tags and robots.txt.
 * The production domain is not decided yet, so nothing is hard-coded here.
 * BASE_PATH is the sub-path when the site is served from a folder (GitHub project pages: /rebound-ops).
 */
const SITE_URL = (process.env.SITE_URL || 'http://localhost:4321').replace(/\/+$/, '');
const BASE_PATH = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  prefetch: false,
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
    }),
  ],
});
