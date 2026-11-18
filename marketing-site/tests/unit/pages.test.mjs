import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pages, dist, SITE_URL, BASE, PRODUCTION, servedPath, resolvePath } from './_lib.mjs';

const REQUIRED = ['index.html', 'features/index.html', 'how-it-works/index.html', 'preview/index.html', 'download/index.html', 'privacy/index.html', 'docs/index.html', 'faq/index.html', 'changelog/index.html', '404.html'];

test('every required page is built', () => {
  for (const f of REQUIRED) assert.ok(existsSync(join(dist, f)), `missing ${f}`);
});

test('each page has lang, one h1, and no skipped heading levels', () => {
  for (const { file, doc } of pages()) {
    assert.equal(doc.documentElement.getAttribute('lang'), 'en-GB', file);
    assert.equal(doc.querySelectorAll('h1').length, 1, `${file}: exactly one h1`);
    let prev = 0;
    for (const h of doc.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      const level = Number(h.tagName[1]);
      assert.ok(level <= prev + 1 || prev === 0, `${file}: <${h.tagName.toLowerCase()}> "${h.textContent.trim().slice(0, 40)}" skips a level after h${prev}`);
      prev = level;
    }
  }
});

test('titles and descriptions are present, unique and reasonable', () => {
  const titles = new Set();
  const descs = new Set();
  for (const { file, doc } of pages()) {
    const title = doc.querySelector('title')?.textContent?.trim() ?? '';
    const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    assert.ok(title.length >= 10 && title.length <= 70, `${file}: title length ${title.length}`);
    assert.ok(desc.length >= 70 && desc.length <= 200, `${file}: description length ${desc.length}`);
    assert.ok(!titles.has(title), `${file}: duplicate title`);
    assert.ok(!descs.has(desc), `${file}: duplicate description`);
    titles.add(title);
    descs.add(desc);
  }
});

test('canonical and Open Graph URLs use SITE_URL, and OG images exist', () => {
  for (const { file, doc } of pages()) {
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
    assert.ok(canonical.startsWith(SITE_URL + BASE), `${file}: canonical ${canonical}`);
    if (file !== '404.html') assert.equal(new URL(canonical).pathname, servedPath(file), `${file}: canonical path`);
    assert.equal(doc.querySelector('meta[property="og:url"]')?.getAttribute('content'), canonical, `${file}: og:url`);
    const og = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '';
    assert.ok(og.startsWith(SITE_URL), `${file}: og:image absolute`);
    assert.ok(resolvePath(new URL(og).pathname), `${file}: og image file missing for ${og}`);
    assert.ok(doc.querySelector('meta[name="twitter:card"]'), `${file}: twitter card`);
  }
});

test('robots meta matches the build mode', () => {
  for (const { file, doc } of pages()) {
    const robots = doc.querySelector('meta[name="robots"]')?.getAttribute('content');
    if (file === '404.html' || !PRODUCTION) assert.match(robots, /noindex/, file);
    else assert.equal(robots, 'index, follow', file);
  }
});

test('structured data is valid JSON and has no ratings or reviews', () => {
  let software = 0;
  for (const { file, doc } of pages()) {
    for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
      const data = JSON.parse(s.textContent);
      assert.equal(data['@context'], 'https://schema.org', file);
      const text = JSON.stringify(data);
      assert.doesNotMatch(text, /aggregateRating|"review"|ratingValue|ratingCount|reviewCount|downloadCount|userInteractionCount/i, `${file}: no ratings or counts`);
      if (data['@type'] === 'SoftwareApplication') {
        software++;
        assert.equal(data.softwareVersion, '0.2.0');
        assert.ok(data.name && data.operatingSystem && data.applicationCategory && data.offers, `${file}: SoftwareApplication fields`);
      }
    }
  }
  assert.ok(software >= 1, 'at least one SoftwareApplication');
});

test('images have alt text and intrinsic size (no layout shift)', () => {
  for (const { file, doc } of pages()) {
    for (const img of doc.querySelectorAll('img')) {
      assert.ok(img.hasAttribute('alt'), `${file}: img without alt`);
      assert.ok(img.getAttribute('width') && img.getAttribute('height'), `${file}: img without width/height`);
    }
  }
});

test('no invented claims or misleading promises in page copy', () => {
  const banned = [
    [/\bauto[- ]?(apply|applies|applying|submit)/i, 'auto-apply'],
    [/testimonial|“[^”]{10,}”\s*[—–-]\s*[A-Z][a-z]+ [A-Z]/, 'testimonial'],
    [/\b\d[\d,.]*\s*k?\+?\s+(users|downloads|stars|customers|companies|hires|placements)\b/i, 'usage or success numbers'],
    [/\.(dmg|exe|msi|pkg|deb|rpm|appimage)\b|App Store|Microsoft Store|Homebrew/i, 'native installer'],
    [/AI[- ]powered|powered by AI|requires? (an )?AI\b/i, 'AI required'],
    [/guarantee|land your dream|get hired faster|\d+% (more|faster|higher)/i, 'success claim'],
    [/rebound-orgs\.org/i, 'wrong domain (the site lives at rebound-ops.org)'],
  ];
  for (const { file, doc } of pages()) {
    const text = doc.body.textContent.replace(/\s+/g, ' ');
    for (const [re, what] of banned) assert.doesNotMatch(text, re, `${file}: ${what}`);
  }
});

test('synthetic demo data is labelled wherever demos appear', () => {
  for (const { file, doc } of pages()) {
    const demos = doc.querySelectorAll('.fit-demo, .doc-demo, .tracker-demo, .ai-demo');
    for (const d of demos) assert.ok(d.querySelector('.synthetic-label'), `${file}: demo without synthetic-data label`);
  }
});
