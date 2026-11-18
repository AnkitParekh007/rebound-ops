import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dist, files, htmlFiles, resolvePath, servedPath, SITE_URL, PRODUCTION } from './_lib.mjs';

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test('sitemap index and sitemap are well-formed and complete', () => {
  const index = readFileSync(join(dist, 'sitemap-index.xml'), 'utf8');
  assert.match(index, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(index, /<sitemapindex xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  const maps = locs(index);
  assert.ok(maps.length >= 1);
  const urls = [];
  for (const m of maps) {
    assert.ok(m.startsWith(SITE_URL), `sitemap url ${m}`);
    const file = resolvePath(new URL(m).pathname);
    assert.ok(file, `sitemap file missing: ${m}`);
    const xml = readFileSync(join(dist, file), 'utf8');
    assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
    urls.push(...locs(xml));
  }
  assert.equal(new Set(urls).size, urls.length, 'no duplicate URLs');
  for (const u of urls) {
    assert.ok(u.startsWith(SITE_URL), `url not on SITE_URL: ${u}`);
    const f = resolvePath(new URL(u).pathname);
    assert.ok(f && f.endsWith('.html'), `sitemap URL has no page: ${u}`);
    assert.notEqual(f, '404.html', '404 must not be in the sitemap');
  }
  const expected = htmlFiles.filter((f) => f !== '404.html').map((f) => SITE_URL + servedPath(f)).sort();
  assert.deepEqual([...urls].sort(), expected, 'every page is listed exactly once');
});

test('robots.txt matches the build mode', () => {
  assert.ok(files.includes('robots.txt'));
  const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
  if (PRODUCTION) {
    assert.match(robots, /^User-agent: \*\nAllow: \//m);
    assert.ok(robots.includes(`Sitemap: ${SITE_URL}`), 'robots points at the sitemap');
  } else {
    assert.match(robots, /Disallow: \/\n/);
  }
});
