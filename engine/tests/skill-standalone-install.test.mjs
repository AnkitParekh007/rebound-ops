// tests/skill-standalone-install.test.mjs — a skill installed on its own must
// lead the user to rebound-ops instead of stopping in silence.
//
// Skill catalogs (`npx skills add AnkitParekh007/rebound-ops`) copy only
// .agents/skills/rebound-ops/SKILL.md. Nothing around it holds AGENTS.md or
// modes/, so Project Root Resolution finds no PROJECT_ROOT. The router used to
// say only "stop and locate the checkout", which left a user who had pasted a
// job URL with no next step. It now carries a "Skill installed without
// rebound-ops" branch: look for an existing install, offer `init` with the
// user's yes, then pick up the original request.
//
// HERMETIC: copies SKILL.md alone into a temp directory, the way a catalog does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE = join(ROOT, '.agents', 'skills', 'rebound-ops', 'SKILL.md');
const ENTRYPOINTS = ['.agents', '.antigravitycli', '.claude', '.grok', '.kimi', '.opencode', '.qwen']
  .map((dir) => join(ROOT, dir, 'skills', 'rebound-ops', 'SKILL.md'));
const HEADING = '### Skill installed without rebound-ops';

function findProjectRoot(skillPath) {
  let current = dirname(skillPath);
  while (true) {
    if (existsSync(join(current, 'AGENTS.md')) && existsSync(join(current, 'modes'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function standaloneBranch(text) {
  const start = text.indexOf(HEADING);
  if (start === -1) return '';
  const next = text.indexOf('\n### ', start + HEADING.length);
  return text.slice(start, next === -1 ? undefined : next);
}

test('a catalog-style install has only SKILL.md and no PROJECT_ROOT', () => {
  const dir = mkdtempSync(join(tmpdir(), 'co-skill-only-'));
  try {
    const skillDir = join(dir, '.claude', 'skills', 'rebound-ops');
    mkdirSync(skillDir, { recursive: true });
    copyFileSync(SOURCE, join(skillDir, 'SKILL.md'));
    assert.deepEqual(readdirSync(skillDir), ['SKILL.md']);
    assert.equal(findProjectRoot(join(skillDir, 'SKILL.md')), null, 'a temp dir should not resolve to a rebound-ops checkout');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the missing-sentinel rule points at the standalone branch', () => {
  const text = readFileSync(SOURCE, 'utf8');
  assert.match(text, /If those two sentinels cannot be found[^\n]*Skill installed without rebound-ops/);
  assert.ok(text.includes(HEADING), `SKILL.md has no "${HEADING}" section`);
});

test('the standalone branch looks for an install, asks before init and resumes the request', () => {
  const branch = standaloneBranch(readFileSync(SOURCE, 'utf8'));
  for (const place of ['REBOUND_OPS_ROOT', './rebound-ops', '~/rebound-ops']) {
    assert.ok(branch.includes(place), `standalone branch does not look in ${place}`);
  }
  // The installer ships inside the repository; no registry package is launched.
  assert.ok(branch.includes('node engine/scaffolder/bin/cli.mjs init'), 'standalone branch does not name the local init command');
  assert.doesNotMatch(branch, /\bnpx @/, 'standalone branch launches a registry package');
  assert.match(branch, /Ask before running it/, 'standalone branch must ask before installing');
  assert.match(branch, /original request/, 'standalone branch must pick the user\'s request back up');
  assert.match(branch, /https:\/\/github\.com\/AnkitParekh007\/rebound-ops(?![\w-])/, 'standalone branch must link the canonical repo');
  assert.doesNotMatch(branch, /github\.com\/santifer\//, 'standalone branch links the old repo path');
});

test('every SKILL.md entrypoint carries the same standalone branch', () => {
  const expected = standaloneBranch(readFileSync(SOURCE, 'utf8'));
  for (const entry of ENTRYPOINTS) {
    assert.equal(standaloneBranch(readFileSync(entry, 'utf8')), expected, `${entry} differs from .agents/skills/rebound-ops/SKILL.md`);
  }
});
