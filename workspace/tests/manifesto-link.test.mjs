import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('principles remain accessible without a promotional credits link', () => {
  const html = read('public/index.html');
  assert(html.includes('blob/main/docs/principles.md'));
  assert(!html.includes('href="#/credits"'));
  assert(!html.includes('data-i18n="footer.manifesto"'));
  const notices = read('public/legal/third-party-notices.txt');
  for (const name of ['Ankit Parekh', 'Ankit Parekh']) assert(notices.includes(name));
});
test('help guides explain product principles without promotional source credits', () => {
  for (const name of readdirSync(new URL('../docs/help/', import.meta.url)).filter(name => name.endsWith('.md'))) {
    const text = read('docs/help/' + name);
    assert(text.includes('## 29.'));
    assert(text.includes('docs/principles.md'));
    assert(!/first reference implementation|740 listings/i.test(text));
  }
});
