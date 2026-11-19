#!/usr/bin/env node
/**
 * Generates the 1200×630 Open Graph images in public/og/ from original artwork:
 * an SVG background (rebound arc motif) plus text rendered with the self-hosted OFL fonts.
 * Run: npm run og. Output is committed; re-run when titles change.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'og');
mkdirSync(out, { recursive: true });
const font = (pkg, file) => join(root, 'node_modules', '@fontsource-variable', pkg, 'files', file);
const DISPLAY = font('bricolage-grotesque', 'bricolage-grotesque-latin-wdth-normal.woff2');
const BODY = font('instrument-sans', 'instrument-sans-latin-wdth-normal.woff2');

const pages = [
  { name: 'default', kicker: 'Local-first job search', title: 'ReboundOps', sub: 'Private, open source, AI optional.' },
  { name: 'home', kicker: 'Local-first job search', title: 'Run your job search on your own computer.', sub: 'Evidence-backed fit, grounded documents, follow-ups. No account. AI optional.' },
  { name: 'features', kicker: 'Features · v0.2.0', title: 'What ReboundOps does today', sub: 'Import, Discover, explainable fit, grounded documents, tracking and backups.' },
  { name: 'how-it-works', kicker: 'How it works', title: 'Six steps, all on your computer', sub: 'From resume facts to follow-ups you send yourself.' },
  { name: 'preview', kicker: 'Product preview', title: 'The real app, with made-up data', sub: 'Screenshots captured from the released version.' },
  { name: 'download', kicker: 'Download · pre-release', title: 'ReboundOps 0.2.0', sub: 'Node.js 24 release archive with a prebuilt web app.' },
  { name: 'privacy', kicker: 'Privacy and open source', title: 'Private because there’s nowhere else for it to go', sub: 'Loopback-only, one SQLite file, consent before any network request.' },
  { name: 'docs', kicker: 'Documentation', title: 'Using ReboundOps', sub: 'Install, configure, back up, import and troubleshoot.' },
  { name: 'faq', kicker: 'FAQ', title: 'Straight answers, including the limits', sub: 'It never applies for you. AI is never required.' },
  { name: 'changelog', kicker: 'Changelog', title: 'Releases', sub: 'v0.2.0 and v0.1.0 — both pre-releases.' },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function background() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g1" cx="0.88" cy="0.05" r="0.7"><stop offset="0" stop-color="#6f93ff" stop-opacity="0.38"/><stop offset="1" stop-color="#6f93ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0.05" cy="1" r="0.6"><stop offset="0" stop-color="#3ff0a6" stop-opacity="0.2"/><stop offset="1" stop-color="#3ff0a6" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#eef2f8" fill-opacity="0.07"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="#090d16"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>
  <path d="M690 572 H960" stroke="#eef2f8" stroke-opacity="0.25" stroke-width="2"/>
  <path d="M710 560 Q 770 450 830 560" fill="none" stroke="#6f93ff" stroke-width="6" stroke-linecap="round"/>
  <path d="M830 560 C 870 450, 970 395, 1095 380" fill="none" stroke="#3ff0a6" stroke-width="6" stroke-linecap="round"/>
  <circle cx="1128" cy="376" r="16" fill="#3ff0a6"/>
  <g transform="translate(72 64) scale(1.625)">
    <rect width="32" height="32" rx="9" fill="#111725" stroke="#2b3549" stroke-width="0.6"/>
    <path d="M5 25.5 H16" stroke="#eef2f8" stroke-opacity=".3" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M5.5 24 Q 8.5 17 11.5 24" fill="none" stroke="#6f93ff" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M11.5 24 C 13.5 15, 17.5 9.5, 23 8.2" fill="none" stroke="#3ff0a6" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="25.4" cy="7.8" r="3.1" fill="#3ff0a6"/>
  </g>
</svg>`);
}

async function text(markup, fontfile, fontName, width) {
  const { data, info } = await sharp({ text: { text: markup, fontfile, font: fontName, rgba: true, width, wrap: 'word', dpi: 72 } })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

for (const p of pages) {
  const brand = await text(`<span foreground="#eef2f8" size="30pt" weight="bold">Rebound<span foreground="#6f93ff">Ops</span></span>`, DISPLAY, 'Bricolage Grotesque Variable', 400);
  const kicker = await text(`<span foreground="#9db4ff" size="22pt" weight="600" letter_spacing="2000">${esc(p.kicker.toUpperCase())}</span>`, BODY, 'Instrument Sans Variable', 1000);
  const titleSize = p.title.length > 40 ? 58 : p.title.length > 26 ? 68 : 84;
  const title = await text(`<span foreground="#eef2f8" size="${titleSize}pt" weight="bold" letter_spacing="-1500">${esc(p.title)}</span>`, DISPLAY, 'Bricolage Grotesque Variable', 900);
  const sub = await text(`<span foreground="#b5c0d2" size="26pt">${esc(p.sub)}</span>`, BODY, 'Instrument Sans Variable', 1000);
  const titleTop = 200;
  const subTop = Math.min(titleTop + title.info.height + 28, 560 - sub.info.height);
  await sharp(background())
    .composite([
      { input: brand.data, left: 140, top: 74 },
      { input: kicker.data, left: 72, top: titleTop - kicker.info.height - 22 },
      { input: title.data, left: 72, top: titleTop },
      { input: sub.data, left: 72, top: subTop },
    ])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(join(out, `${p.name}.png`));
  console.log(`og/${p.name}.png`);
}
