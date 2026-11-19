/** Build-time site settings. See astro.config.mjs and docs/DEPLOYMENT.md. */
export const SITE_ENV: 'production' | 'preview' = process.env.SITE_ENV === 'production' ? 'production' : 'preview';

/** Only production builds may be indexed. Preview builds send noindex and a disallow-all robots.txt. */
export const INDEXABLE = SITE_ENV === 'production';

const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/** Internal link that respects BASE_PATH. `href('/docs/')` → `/rebound-ops/docs/` on project pages. */
export function href(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return `${base}${clean}`;
}

/** Absolute URL on SITE_URL (for canonicals and Open Graph). */
export function absolute(path: string, site: URL | undefined): string {
  if (!site) throw new Error('SITE_URL is required (astro `site`).');
  return new URL(href(path), site).toString();
}
