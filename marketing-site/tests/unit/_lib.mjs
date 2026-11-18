/** Shared helpers for the static-output tests. They read dist/ — run `npm run build` first. */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const dist = join(root, 'dist');
export const SITE_URL = (process.env.SITE_URL || 'http://localhost:4321').replace(/\/+$/, '');
export const BASE = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
export const PRODUCTION = process.env.SITE_ENV === 'production';

if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('dist/ not found. Run `npm run build` before `npm test`.');
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

export const files = walk(dist).map((f) => relative(dist, f).split('\\').join('/'));
export const htmlFiles = files.filter((f) => f.endsWith('.html'));

const cache = new Map();
export function page(file) {
  if (!cache.has(file)) {
    const html = readFileSync(join(dist, file), 'utf8');
    cache.set(file, { file, html, doc: new JSDOM(html).window.document });
  }
  return cache.get(file);
}
export const pages = () => htmlFiles.map(page);

/** Map a site path (with BASE) to a file in dist, or null. */
export function resolvePath(pathname) {
  let p = decodeURIComponent(pathname);
  if (!p.startsWith(BASE)) return null;
  p = p.slice(BASE.length);
  const candidates = p === '' ? ['index.html'] : p.endsWith('/') ? [`${p}index.html`] : [p, `${p}/index.html`, `${p}.html`];
  return candidates.find((c) => files.includes(c)) ?? null;
}

/** The public path a dist html file is served at. */
export function servedPath(file) {
  if (file === 'index.html') return BASE;
  if (file.endsWith('/index.html')) return BASE + file.slice(0, -'index.html'.length);
  return BASE + file;
}
