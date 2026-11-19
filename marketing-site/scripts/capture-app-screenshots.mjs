#!/usr/bin/env node
/**
 * Reproducible product screenshots of the real released app.
 *
 * 1. Extracts the release tag (default v0.2.0) with `git archive` into .capture-tmp/app — the
 *    working tree is never touched — then runs `npm ci` and `npm run build` there.
 *    (Set CAPTURE_APP_DIR to an already-built checkout of that tag to skip this.)
 * 2. Starts the production server (the API serves the built web app) against a throwaway data
 *    folder, on a random loopback port.
 * 3. Seeds it only through the public HTTP API with the fictional fixtures in tests/fixtures.
 * 4. Captures desktop (1440×900) and mobile (390×844 @2x) screenshots with Playwright.
 * 5. Writes AVIF + WebP to public/screenshots/ and src/data/screenshots.json (source tag/commit).
 * 6. Deletes the data folder. On any failure, nothing in public/ or the manifest is changed.
 *
 * CAPTURE_SEED_ONLY=1 runs steps 1–3 without a browser and writes nothing (a dry run of the seeding).
 *
 * Usage: npm run screenshots:app   (env: CAPTURE_TAG, CAPTURE_APP_DIR, CAPTURE_BROWSER=chromium|firefox|webkit,
 *                                    CAPTURE_OLLAMA_MODEL to show AI assist with a model you already have)
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import sharp from 'sharp';
import { chromium, firefox, webkit } from '@playwright/test';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(site, '..');
const TAG = process.env.CAPTURE_TAG || 'v0.2.0';
const BROWSER = process.env.CAPTURE_BROWSER || 'chromium';
const work = join(site, '.capture-tmp');
const log = (...a) => console.log('[capture]', ...a);
const sh = (cmd, args, cwd, extra = {}) => execFileSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...extra } });

const commit = execFileSync('git', ['rev-parse', '--short', `${TAG}^{commit}`], { cwd: repo, encoding: 'utf8' }).trim();
log(`source ${TAG} → ${commit}`);

/* ---------- 1. app checkout ---------- */
let appDir = process.env.CAPTURE_APP_DIR;
if (!appDir) {
  appDir = join(work, 'app');
  rmSync(appDir, { recursive: true, force: true });
  mkdirSync(appDir, { recursive: true });
  const tar = execFileSync('git', ['archive', '--format=tar', TAG], { cwd: repo, maxBuffer: 1 << 28 });
  execFileSync('tar', ['-x', '-C', appDir], { input: tar });
  log('installing and building the app (needs the npm registry once)…');
  sh('npm', ['ci', '--no-audit', '--no-fund'], appDir);
  sh('npm', ['run', 'build'], appDir, { NG_CLI_ANALYTICS: 'false' });
}
if (!existsSync(join(appDir, 'apps/web/dist'))) throw new Error(`No web build in ${appDir}/apps/web/dist`);

/* ---------- 2. server ---------- */
const freePort = () => new Promise((res, rej) => {
  const s = createServer();
  s.unref();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});
const port = await freePort();
const dataDir = mkdtempSync(join(tmpdir(), 'rbo-capture-'));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['apps/api/src/main.ts'], {
  cwd: appDir,
  env: { ...process.env, REBOUND_DATA_DIR: dataDir, REBOUND_API_PORT: String(port), REBOUND_API_HOST: '127.0.0.1', REBOUND_LOG_LEVEL: 'warn' },
  stdio: ['ignore', 'inherit', 'inherit'],
});
const cleanup = () => { try { server.kill('SIGINT'); } catch { /* already gone */ } };
process.on('exit', () => { cleanup(); rmSync(dataDir, { recursive: true, force: true }); });

async function api(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
for (let i = 0; ; i++) {
  try { await api('GET', '/api/health'); break; } catch (e) {
    if (i > 100) throw new Error(`server did not start: ${e.message}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}
log(`server on ${base}, data in a temporary folder`);

/* ---------- browser ---------- */
const SEED_ONLY = process.env.CAPTURE_SEED_ONLY === '1';
const engines = { chromium, firefox, webkit };
const browser = SEED_ONLY ? null : await engines[BROWSER].launch();
const browserLabel = SEED_ONLY ? 'none' : `${BROWSER} ${browser.version()}`;
const shotsTmp = join(work, 'raw');
rmSync(shotsTmp, { recursive: true, force: true });
mkdirSync(shotsTmp, { recursive: true });
const viewports = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const contexts = {};
if (!SEED_ONLY) for (const [k, opts] of Object.entries(viewports)) contexts[k] = await browser.newContext({ ...opts, colorScheme: 'light', reducedMotion: 'reduce', locale: 'en-GB' });

async function capture(id, path, anchor) {
  if (SEED_ONLY) {
    const res = await fetch(base + path);
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    log(`dry run: ${path} served (${anchor ?? 'h1'} would be captured as ${id})`);
    return;
  }
  for (const [vp, ctx] of Object.entries(contexts)) {
    const page = await ctx.newPage();
    await page.goto(base + path, { waitUntil: 'networkidle' });
    if (anchor) {
      const el = page.locator(anchor).first();
      await el.waitFor({ state: 'visible', timeout: 15_000 });
      await el.evaluate((n) => { n.scrollIntoView({ block: 'start' }); window.scrollBy(0, -88); });
    } else {
      await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15_000 });
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(shotsTmp, `${id}-${vp}.png`) });
    await page.close();
  }
  log(`captured ${id}`);
}

/* ---------- 3. seed + capture ---------- */
const fixture = (p) => readFileSync(join(appDir, 'tests/fixtures', p), 'utf8');

// Onboarding first, while the app is fresh.
await capture('onboarding', '/welcome');

await api('PUT', '/api/onboarding', { status: 'skipped' });
if (process.env.CAPTURE_OLLAMA_MODEL) await api('PUT', '/api/settings/ai', { provider: 'ollama', model: process.env.CAPTURE_OLLAMA_MODEL });

const resumeText = fixture('resumes/jordan-fictional.txt');
const imported = await api('POST', '/api/resume/import', { filename: 'jordan-fictional.txt', contentBase64: Buffer.from(resumeText).toString('base64') });
const p = imported.proposal;
await api('PUT', '/api/profile', {
  displayName: p.displayName, headline: p.headline, contact: p.contact, skills: p.skills,
  targetRoles: ['Platform Engineer'], preferredCountries: ['Portugal'], workArrangements: ['hybrid', 'remote'],
  workAuthorizedCountries: ['Portugal'], requiresSponsorship: 'no', openToRelocation: 'no',
  experience: p.experience.map((e) => ({ ...e, verified: true })),
  education: p.education.map((e) => ({ ...e, verified: true })),
  certifications: p.certifications.map((c) => ({ ...c, verified: true })),
});

const jobFiles = readdirSync(join(appDir, 'tests/fixtures/jobs')).filter((f) => f.endsWith('.txt')).sort();
const ids = [];
for (const [i, f] of jobFiles.entries()) {
  const ex = await api('POST', '/api/jobs/extract', { description: fixture(`jobs/${f}`), sourceUrl: `https://careers.example.test/posting/${100 + i}` });
  if (!ex.title || !ex.employer) { log(`skipping ${f}: title or employer not stated in the fixture`); continue; }
  const prov = (x) => (x ? { origin: 'extracted', evidence: x.evidence } : null);
  const created = await api('POST', '/api/jobs', {
    title: ex.title.value, employer: ex.employer.value, location: ex.location?.value ?? null,
    salary: ex.salary?.value ?? null, workArrangement: ex.workArrangement?.value ?? null, sourceUrl: ex.sourceUrl, description: ex.description,
    provenance: { title: prov(ex.title), employer: prov(ex.employer), location: prov(ex.location), salary: prov(ex.salary) },
  });
  ids.push(created.application.id);
}
if (ids.length === 0) throw new Error('no fixture could be seeded');
// Feature the posting with the highest fit; the others stay as seeded.
const fits = await Promise.all(ids.map(async (id) => [id, (await api('GET', `/api/applications/${id}/assessment`)).fit?.overall ?? 0]));
fits.sort((a, b) => b[1] - a[1]);
const main = fits[0][0];
const other = fits[1]?.[0];
await api('POST', `/api/applications/${main}/documents/generate`, {});
for (const to of ['shortlisted', 'preparing', 'ready_for_review']) await api('POST', `/api/applications/${main}/transitions`, { to });
await api('POST', `/api/applications/${main}/transitions`, { to: 'applied', confirmSubmitted: true });
await api('POST', `/api/applications/${main}/contacts`, { name: 'Riley Recruiter (fictional)', email: 'riley@example.test' });
if (other) await api('POST', `/api/applications/${other}/transitions`, { to: 'shortlisted' });
log(`seeded ${ids.length} fictional applications`);

await capture('dashboard', '/');
await capture('discover', '/discover');
await capture('assessment', `/tracker/${main}`, '#fit-heading');
await capture('documents', `/tracker/${main}`, '#docs-heading');
await capture('tracker', '/tracker');
await capture('ai-assist', `/tracker/${main}`, '#assist-heading');
await capture('settings', '/settings', '#data-heading');
if (SEED_ONLY) {
  const dash = await api('GET', '/api/dashboard');
  log(`dry run complete; dashboard keys: ${Object.keys(dash).join(', ')}`);
  for (const id of ids) {
    const a = await api('GET', `/api/applications/${id}/assessment`);
    log(`assessment ${id}: fit ${a.fit?.overall}, eligibility ${a.eligibility?.status}`);
  }
  cleanup();
  process.exit(0);
}
await browser.close();
cleanup();

/* ---------- 5. optimise + manifest (only after every capture succeeded) ---------- */
const aiOn = Boolean(process.env.CAPTURE_OLLAMA_MODEL);
const META = {
  onboarding: { title: 'Onboarding', caption: 'The first screen of the welcome flow, with skip, back and next.', alt: 'ReboundOps welcome screen introducing the app, with buttons to skip or continue setup' },
  dashboard: { title: 'Overview', caption: 'Pipeline, next actions, reminders and outcomes from the seeded fictional records.', alt: 'ReboundOps overview dashboard with the pipeline, next actions, reminders and outcome metrics for fictional applications' },
  discover: { title: 'Discover', caption: 'Discover asks for permission before it contacts any job board.', alt: 'ReboundOps Discover page asking for permission before contacting public job boards' },
  assessment: { title: 'Fit assessment', caption: 'The explainable 0–5 fit score with evidence and eligibility for a fictional posting.', alt: 'Fit assessment panel showing a 0 to 5 fit score, per-criterion evidence and an eligibility status for a fictional job' },
  documents: { title: 'Resume and cover letter', caption: 'Tailored drafts built from verified fictional facts, ready to edit and export.', alt: 'Documents panel with a tailored resume and cover letter draft and PDF and DOCX export options' },
  tracker: { title: 'Tracker', caption: 'All applications with their statuses. Applied was confirmed by the user.', alt: 'Tracker listing fictional applications with statuses including Applied and Shortlisted' },
  'ai-assist': {
    title: 'AI assist',
    caption: aiOn ? 'Grounded assist tasks using a local Ollama model.' : 'The AI assist panel with AI off, the default. Everything else works without it.',
    alt: aiOn ? 'AI assist panel offering grounded suggestions from a local model for a fictional application' : 'AI assist panel showing that AI assistance is off, with a pointer to enable it in settings',
  },
  settings: { title: 'Backup and settings', caption: 'Your data: backups, optional password protection, restore and import.', alt: 'Settings page section for your data with backup, password protection, restore and import controls' },
};

const outDir = join(site, 'public/screenshots');
const staging = join(work, 'out');
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
const shots = [];
for (const id of Object.keys(META)) {
  const entry = { id, ...META[id] };
  for (const vp of ['desktop', 'mobile']) {
    const raw = join(shotsTmp, `${id}-${vp}.png`);
    const img = sharp(raw).resize({ width: vp === 'desktop' ? 1440 : 780, withoutEnlargement: true });
    const { width, height } = (await img.clone().png().toBuffer({ resolveWithObject: true })).info;
    const name = `${id}-${vp}`;
    await img.clone().avif({ quality: 55, effort: 6 }).toFile(join(staging, `${name}.avif`));
    await img.clone().webp({ quality: 80, effort: 6 }).toFile(join(staging, `${name}.webp`));
    entry[vp] = { avif: `${name}.avif`, webp: `${name}.webp`, width, height };
  }
  shots.push(entry);
}
rmSync(outDir, { recursive: true, force: true });
renameSync(staging, outDir);
writeFileSync(join(site, 'src/data/screenshots.json'), `${JSON.stringify({
  status: 'captured',
  source: { tag: TAG, commit, capturedAt: new Date().toISOString(), dataset: 'fictional fixtures from tests/fixtures', browser: browserLabel },
  shots,
}, null, 2)}\n`);
log(`wrote ${shots.length * 4} files to public/screenshots and updated src/data/screenshots.json`);
log('Review every image and its alt text before committing.');
