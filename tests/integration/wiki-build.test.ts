import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decide, MARKER, PAGES, REPO_URL, renderPage, renderSidebar, rewriteLinks } from '../../scripts/community/build-wiki.ts';

const root = resolve(import.meta.dirname, '..', '..');

describe('wiki build', () => {
  it('every page source exists and page names are unique', () => {
    for (const p of PAGES) expect(existsSync(join(root, p.source)), p.source).toBe(true);
    expect(new Set(PAGES.map((p) => p.page)).size).toBe(PAGES.length);
  });

  it('rewrites links to published docs as wiki pages and others to the repository', () => {
    const out = rewriteLinks('[i](INSTALL.md#upgrading-from-v010) [l](../LICENSE) [x](https://example.org) [a](#top) ![m](assets/brand/mark.svg)', 'docs/X.md', 'main');
    expect(out).toContain('[i](Installation#upgrading-from-v010)');
    expect(out).toContain(`[l](${REPO_URL}/blob/main/LICENSE)`);
    expect(out).toContain('[x](https://example.org)');
    expect(out).toContain('[a](#top)');
    expect(out).toContain(`![m](${REPO_URL}/raw/main/docs/assets/brand/mark.svg)`);
  });

  it('leaves no relative file links in any generated page', () => {
    for (const p of PAGES) {
      const html = renderPage(p, readFileSync(join(root, p.source), 'utf8'), 'main');
      expect(html.startsWith(MARKER)).toBe(true);
      const relative = [...html.matchAll(/\]\(([^)\s]+)/g)].map((m) => m[1]!).filter((t) => !/^(https:|#|mailto:)/.test(t) && !PAGES.some((q) => t.split('#')[0] === q.page));
      expect(relative, p.page).toEqual([]);
    }
    expect(renderSidebar()).toContain('[Installation](Installation)');
  });

  it('never overwrites hand-written pages and updates generated ones only on request', () => {
    expect(decide(null, 'new', false)).toBe('created');
    expect(decide('Written on GitHub by hand', `${MARKER} x -->`, true)).toBe('skipped-hand-written');
    expect(decide(`${MARKER} old -->`, `${MARKER} new -->`, false)).toBe('skipped-existing');
    expect(decide(`${MARKER} old -->`, `${MARKER} new -->`, true)).toBe('updated');
    expect(decide(`${MARKER} same -->`, `${MARKER} same -->`, true)).toBe('unchanged');
  });
});
