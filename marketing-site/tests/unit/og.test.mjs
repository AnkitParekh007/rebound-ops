import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { root } from './_lib.mjs';

test('Open Graph images are 1200×630 PNGs', async () => {
  const dir = join(root, 'public/og');
  const pngs = readdirSync(dir).filter((f) => f.endsWith('.png'));
  assert.ok(pngs.length >= 10);
  for (const f of pngs) {
    const m = await sharp(join(dir, f)).metadata();
    assert.equal(`${m.width}x${m.height}`, '1200x630', f);
  }
});
