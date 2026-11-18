/**
 * Screenshot verification. A "captured" manifest must cover every required view at desktop and
 * mobile size, with existing AVIF and WebP files, real dimensions and alt text. A "pending" manifest
 * must ship no images and the preview page must show the honest fallback instead.
 * REQUIRE_SCREENSHOTS=1 (release builds) fails while capture is pending.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { root, page } from './_lib.mjs';

const manifest = JSON.parse(readFileSync(join(root, 'src/data/screenshots.json'), 'utf8'));
const required = [...readFileSync(join(root, 'src/data/screenshots.ts'), 'utf8').matchAll(/\{ id: '([\w-]+)', title:/g)].map((m) => m[1]);
const shotsDir = join(root, 'public/screenshots');

test('required view list is defined', () => {
  assert.equal(required.length, 8);
});

test('release builds require captured screenshots', { skip: process.env.REQUIRE_SCREENSHOTS !== '1' }, () => {
  assert.equal(manifest.status, 'captured', 'screenshots have not been captured (npm run screenshots:app)');
});

if (manifest.status === 'captured') {
  test('every required view has desktop and mobile files with alt text', async () => {
    const ids = manifest.shots.map((s) => s.id);
    for (const id of required) assert.ok(ids.includes(id), `missing view ${id}`);
    assert.match(manifest.source?.commit ?? '', /^[0-9a-f]{7,40}$/, 'source commit recorded');
    assert.ok(manifest.source?.tag, 'source tag recorded');
    for (const s of manifest.shots) {
      assert.ok(s.alt && s.alt.length >= 20, `${s.id}: alt text`);
      for (const vp of ['desktop', 'mobile']) {
        const f = s[vp];
        for (const kind of ['avif', 'webp']) {
          const p = join(shotsDir, f[kind]);
          assert.ok(existsSync(p), `${s.id} ${vp}: ${f[kind]} missing`);
          const meta = await sharp(p).metadata();
          assert.equal(meta.width, f.width, `${s.id} ${vp} ${kind}: width`);
          assert.equal(meta.height, f.height, `${s.id} ${vp} ${kind}: height`);
        }
      }
    }
  });
  test('preview page shows every screenshot', () => {
    const { doc } = page('preview/index.html');
    assert.equal(doc.querySelector('[data-screenshots-pending]'), null);
    assert.equal(doc.querySelectorAll('.gallery img').length, manifest.shots.length * 2);
  });
} else {
  test('pending: no stale images are shipped and the fallback is shown', () => {
    const imgs = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f)) : [];
    assert.deepEqual(imgs, [], 'images present while the manifest is pending');
    assert.equal(manifest.shots.length, 0);
    const { doc } = page('preview/index.html');
    assert.ok(doc.querySelector('[data-screenshots-pending]'), 'fallback section rendered');
    assert.equal(doc.querySelectorAll('.gallery img').length, 0);
  });
}
