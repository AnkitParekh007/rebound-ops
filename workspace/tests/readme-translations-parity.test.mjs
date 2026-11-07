/**
 * README translations: the English README.md carries the content; every
 * README.<lang>.md is a short pointer page to it (the per-language READMEs were
 * replaced when this workspace was rebranded, because their marketing and
 * attribution sections could not be carried over accurately).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TRANSLATED = readdirSync(ROOT).filter((f) => /^README\..+\.md$/.test(f));

test('readme-translations: the English README exists and has content', () => {
  assert.ok(existsSync(resolve(ROOT, 'README.md')));
  assert.ok(readFileSync(resolve(ROOT, 'README.md'), 'utf8').length > 2000, 'README.md looks empty');
});

test('readme-translations: every translated README points to README.md', () => {
  assert.ok(TRANSLATED.length > 0, 'no translated READMEs found');
  for (const f of TRANSLATED) {
    const text = readFileSync(resolve(ROOT, f), 'utf8');
    assert.match(text, /\]\(README\.md\)/, `${f} must link to README.md`);
  }
});
