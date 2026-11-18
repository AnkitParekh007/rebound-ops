/**
 * Link checker for the built site. Internal links and #fragments must resolve inside dist/.
 * External links must be on an allow-list (checked offline). Set CHECK_EXTERNAL=1 to also
 * request each external URL (HEAD, falling back to GET) — this needs network access.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pages, page, resolvePath, SITE_URL, BASE } from './_lib.mjs';

const ALLOWED_HOSTS = new Set(['github.com', 'ollama.com', 'opensource.org']);
const REPO = '/AnkitParekh007/rebound-ops';
const external = new Set();

test('internal links and fragments resolve', () => {
  let checked = 0;
  for (const { file, doc } of pages()) {
    const base = new URL(file === 'index.html' ? BASE : BASE + file.replace(/index\.html$/, ''), SITE_URL);
    for (const a of doc.querySelectorAll('a[href], link[rel="icon"], link[rel="sitemap"], script[src], img[src], source[srcset]')) {
      const raw = a.getAttribute('href') ?? a.getAttribute('src') ?? a.getAttribute('srcset');
      if (!raw || raw.startsWith('mailto:')) continue;
      const url = new URL(raw, base);
      if (url.origin !== new URL(SITE_URL).origin) { external.add(url.toString()); continue; }
      const target = resolvePath(url.pathname);
      assert.ok(target, `${file}: broken link ${raw}`);
      if (url.hash && target.endsWith('.html')) {
        const id = decodeURIComponent(url.hash.slice(1));
        assert.ok(page(target).doc.getElementById(id), `${file}: missing #${id} in ${target}`);
      }
      checked++;
    }
  }
  assert.ok(checked > 50, `checked ${checked} internal links`);
});

test('external links are on the allow-list and point at real release assets', () => {
  const assets = new Set(['reboundops-0.2.0.tar.gz', 'SHA256SUMS', 'THIRD_PARTY_NOTICES.txt', 'reboundops-0.2.0.sbom.json']);
  for (const href of external) {
    const u = new URL(href);
    assert.equal(u.protocol, 'https:', `not https: ${href}`);
    assert.ok(ALLOWED_HOSTS.has(u.hostname), `external host not allowed: ${href}`);
    if (u.hostname === 'github.com') {
      assert.ok(u.pathname.startsWith(REPO), `GitHub link outside the repository: ${href}`);
      const m = u.pathname.match(/\/releases\/download\/(v[\d.]+)\/(.+)$/);
      if (m) {
        assert.equal(m[1], 'v0.2.0', `asset from an unexpected tag: ${href}`);
        assert.ok(assets.has(m[2]), `unknown release asset: ${href}`);
      }
      const tag = u.pathname.match(/\/releases\/tag\/(.+)$/);
      if (tag) assert.ok(['v0.2.0', 'v0.1.0'].includes(tag[1]), `unknown release tag: ${href}`);
    }
  }
});

test('external links respond (CHECK_EXTERNAL=1 only)', { skip: process.env.CHECK_EXTERNAL !== '1' }, async () => {
  const failures = [];
  for (const href of external) {
    const u = new URL(href);
    u.hash = '';
    let res = await fetch(u, { method: 'HEAD', redirect: 'follow' }).catch((e) => ({ ok: false, status: String(e) }));
    if (!res.ok) res = await fetch(u, { redirect: 'follow' }).catch((e) => ({ ok: false, status: String(e) }));
    if (!res.ok) failures.push(`${res.status} ${href}`);
    await new Promise((r) => setTimeout(r, 300));
  }
  assert.deepEqual(failures, []);
});
