import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// __dirname is .../server/lib  →  go up twice to repo root
export const WEB_UI_ROOT = resolve(__dirname, '..', '..');
export const PUBLIC_DIR = resolve(WEB_UI_ROOT, 'public');

/**
 * Resolve where the rebound-ops project root lives:
 *   1. REBOUND_OPS_ROOT env var (absolute or relative to cwd)
 *   2. ../engine  (the sibling engine/ folder in the rebound-ops monorepo)
 *   3. ../  (when the workspace is dropped in as <engine>/web-ui)
 *   4. cwd  (when launched from inside the engine itself)
 *
 * An explicit REBOUND_OPS_ROOT always wins. Otherwise the first of the other two
 * options that contains a recognizable rebound-ops file (cv.md or portals.yml)
 * wins; if none match, default to ../ and let the user notice via the Health page.
 */
function resolveProjectRoot() {
  // An explicit REBOUND_OPS_ROOT is an instruction, not a hint: honouring it only
  // when the directory already holds cv.md/portals.yml made an empty temp root
  // (every CI-isolated test, and any fresh install) silently fall back to the
  // REAL project at ../ on a developer machine. Tests then read real data and
  // the real parent .env; CI, which has no parent beside it, hid the leak.
  if (process.env.REBOUND_OPS_ROOT) {
    return resolve(process.cwd(), process.env.REBOUND_OPS_ROOT);
  }
  const candidates = [];
  candidates.push(resolve(WEB_UI_ROOT, '..', 'engine')); // monorepo: workspace/ beside engine/
  candidates.push(resolve(WEB_UI_ROOT, '..'));     // rebound-ops/web-ui case
  candidates.push(process.cwd());                  // launched from inside rebound-ops

  for (const c of candidates) {
    if (existsSync(resolve(c, 'cv.md')) || existsSync(resolve(c, 'portals.yml'))) {
      return c;
    }
  }
  // No data yet anywhere: default to the monorepo engine/ folder when it exists.
  return existsSync(candidates[0]) ? candidates[0] : candidates[1];
}

export const PROJECT_ROOT = resolveProjectRoot();

export const path = (...segments) => resolve(PROJECT_ROOT, ...segments);

export const PATHS = {
  root: PROJECT_ROOT,
  applications: path('data', 'applications.md'),
  pipeline: path('data', 'pipeline.md'),
  scanHistory: path('data', 'scan-history.tsv'),
  followUps: path('data', 'follow-ups.md'),
  activityLog: path('data', 'activity.jsonl'),
  roleStats: path('data', 'role-stats.jsonl'),
  llmUsage: path('data', 'llm-usage.jsonl'),
  reportsDir: path('reports'),
  jdsDir: path('jds'),
  outputDir: path('output'),
  modesDir: path('modes'),
  // G-008 (v1.15.0) — `modes/_profile.md` is the canonical "Career framing"
  // file per github.com/AnkitParekh007/rebound-ops §Step-5. It holds
  // target roles, framing, exit narrative, comp targets, location policy.
  // Never committed (.gitignore in parent). Surfaced via the new
  // #/config → Modes tab and a read-only card on #/profile.
  modesProfile: path('modes', '_profile.md'),
  modesProfileTemplate: path('modes', '_profile.template.md'),
  interviewPrepDir: path('interview-prep'),
  // v1.90.0 (Epic 15) — the candidate's own STAR+R story bank, inlined into
  // the mock-interview prompt (same trust level as cv.md per DATA_CONTRACT).
  storyBank: path('interview-prep', 'story-bank.md'),
  // v1.91.0 (Epic 16) — saved networking plans (who-to-contact + outreach
  // drafts + company dossier), written only on explicit user Save.
  networkingDir: path('networking'),
  // v1.13.0 — batch evaluate flow (canonical github.com/AnkitParekh007/rebound-ops guide §4).
  batchDir: path('batch'),
  batchInput: path('batch', 'batch-input.tsv'),
  batchRunner: path('batch', 'batch-runner.sh'),
  batchAdditionsDir: path('batch', 'tracker-additions'),
  cv: path('cv.md'),
  // v1.92.0 (Epic 21 — CV Studio) — voice/style source of truth for the
  // "make it human / match my voice" rewrite. Both are in-scope per the
  // DATA_CONTRACT (voice-dna governs HOW text reads; writing-samples are the
  // user's own prose). Never introduce new factual claims from them.
  voiceDna: path('voice-dna.md'),
  writingSamplesDir: path('writing-samples'),
  profile: path('config', 'profile.yml'),
  plugins: path('config', 'plugins.yml'),
  commute: path('data', 'commute.tsv'),
  twoPager: path('config', 'two-pager.yml'),
  // v1.93.0 (Epic 24 — memory layer) — a short, USER-EDITABLE "remember this
  // about me" note (behavioural steering + preferences, never fabricated
  // content). Inlined into bundleProjectContext so it reaches every AI request
  // across all providers. User layer; never overwritten by system updates.
  memory: path('config', 'memory.md'),
  // v1.95.0 (Epic 26 — career plan) — a personalized AI-generated career
  // development plan (roadmap, SMART/OKR goals, skill plan). Saved to the user
  // layer on explicit Save; never overwritten by system updates.
  careerPlan: path('config', 'career-plan.md'),
  portals: path('portals.yml'),
  // v1.128.0 — the canonical application-state definitions
  // (id/label/aliases/dashboard_group). System layer, read-only; the tracker
  // reads it live instead of hardcoding a status whitelist (see
  // server/lib/states.mjs). A hardcoded fallback covers CI isolation.
  statesYml: path('templates', 'states.yml'),
  packageJson: path('package.json'),
  version: path('VERSION'),
  envFile: path('.env'),
};
