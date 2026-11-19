/** WCAG 2.2 contrast of the design tokens in both themes (text ≥ 4.5:1, focus ring ≥ 3:1). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './_lib.mjs';

const css = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
function block(selectorRe) {
  const m = css.match(selectorRe);
  assert.ok(m, `token block ${selectorRe}`);
  const vars = {};
  for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) vars[k] = v;
  return vars;
}
const light = block(/^:root \{([\s\S]*?)^\}/m);
const dark = { ...light, ...block(/:root\[data-theme='dark'\] \{([\s\S]*?)\}/) };
const darkMedia = block(/:root:not\(\[data-theme='light'\]\) \{([\s\S]*?)\}/);

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const TEXT_PAIRS = [
  ...['ink', 'ink-2', 'ink-3'].flatMap((fg) => ['bg', 'bg-sunk', 'surface', 'surface-2'].map((bg) => [fg, bg])),
  ['accent-ink', 'bg'], ['accent-ink', 'surface'], ['accent-ink', 'surface-2'], ['accent-ink', 'accent-soft'], ['accent-ink', 'bg-sunk'],
  ['tide', 'bg'], ['tide', 'surface'], ['tide', 'tide-soft'],
  ['ok', 'ok-soft'], ['ok', 'surface'], ['warn', 'warn-soft'], ['warn', 'surface'], ['bad', 'bad-soft'], ['bad', 'surface'],
  ['ink', 'warn-soft'], ['ink', 'tide-soft'], ['ink-2', 'tide-soft'],
  ['btn-ink', 'btn-bg'], ['signal-ink', 'signal'],
];

for (const [name, t] of [['light', light], ['dark', dark], ['dark (system)', { ...light, ...darkMedia }]]) {
  test(`text contrast ≥ 4.5:1 — ${name} theme`, () => {
    const fails = [];
    for (const [fg, bg] of TEXT_PAIRS) {
      const r = ratio(t[fg], t[bg]);
      if (r < 4.5) fails.push(`${fg} on ${bg}: ${r.toFixed(2)}`);
    }
    assert.deepEqual(fails, []);
  });
  test(`focus ring ≥ 3:1 — ${name} theme`, () => {
    for (const bg of ['bg', 'surface', 'surface-2']) assert.ok(ratio(t.focus, t[bg]) >= 3, `focus on ${bg}: ${ratio(t.focus, t[bg]).toFixed(2)}`);
  });
}

test('dark tokens are identical in the media query and the explicit theme', () => {
  assert.deepEqual(darkMedia, block(/:root\[data-theme='dark'\] \{([\s\S]*?)\}/));
});

test('fixed colours (stage, document previews) meet 4.5:1', () => {
  const s = light;
  const pairs = [
    ...['stage-ink', 'stage-ink-2', 'stage-lime', 'stage-tide', 'stage-amber', 'stage-rose', 'stage-ember'].flatMap((fg) => ['stage-bg', 'stage-surface'].map((bg) => [s[fg], s[bg], `${fg} on ${bg}`])),
    [s['stage-ink'], s['stage-surface-2'], 'stage-ink on stage-surface-2'],
    [s['stage-ink-2'], s['stage-surface-2'], 'stage-ink-2 on stage-surface-2'],
    ['#090d16', s['stage-lime'], 'dark text on lime'],
    ['#8e9ab0', s['stage-bg'], 'code comment'],
    ['#0d1320', '#fbfcfe', 'document text'], ['#3e475a', '#fbfcfe', 'document meta'], ['#1f3fbf', '#fbfcfe', 'document heading'],
    ['#085a5e', '#fbfcfe', 'provenance note'], ['#085a5e', '#eef1f7', 'provenance on hover'], ['#6e4200', '#fbecc9', 'placeholder'],
    ['#8a5300', '#fbecc9', 'hero placeholder'], ['#0d1320', '#f7f8fb', 'hero page text'], ['#1f3fbf', '#f7f8fb', 'hero section label'],
    ['#173a2c', '#7ef2c0', 'muted on signal (light)'], ['#173a2c', '#3ff0a6', 'muted on signal (dark)'],
  ];
  const fails = pairs.filter(([a, b]) => ratio(a, b) < 4.5).map(([a, b, n]) => `${n}: ${ratio(a, b).toFixed(2)}`);
  assert.deepEqual(fails, []);
});
