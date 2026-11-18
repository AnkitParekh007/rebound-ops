import type { APIRoute } from 'astro';
import { INDEXABLE, absolute } from '../lib/site';

/** Production builds allow crawling and point to the sitemap; preview builds disallow everything. */
export const GET: APIRoute = ({ site }) => {
  const body = INDEXABLE
    ? `User-agent: *\nAllow: /\n\nSitemap: ${absolute('/sitemap-index.xml', site)}\n`
    : `# Preview build (SITE_ENV is not "production"): not for indexing.\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
