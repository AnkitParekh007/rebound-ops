/** Canonical career records: fixtures/scaffolds elsewhere are not user data. */
const files = new Set([
  'cv.md', 'voice-dna.md', 'article-digest.md', 'portals.yml', '.pii-token-map.json',
  'config/profile.yml', 'config/two-pager.yml', 'config/memory.md', 'config/career-plan.md',
  'config/plugins.yml', 'config/cv-facts.json', 'config/benchmarks.yml', 'config/privacy.yml',
  'config/local-paths.txt', 'modes/_profile.md', 'modes/_custom.md', 'modes/_brief.md'
]);
const scaffolds = new Set([
  'data/.gitkeep', 'data/offers/.gitkeep', 'data/parser-output/.gitkeep',
  'documents/.gitkeep', 'documents/README.md', 'jds/.gitkeep', 'reports/.gitkeep',
  'output/.gitkeep', 'interview-prep/.gitkeep', 'interview-prep/sessions/.gitkeep',
  'interview-prep/sessions/README.md', 'writing-samples/README.md',
  'batch/tracker-additions/.gitkeep'
]);
export function isCareerRecord(path) {
  const local = path.replaceAll('\\', '/').replace(/^engine\//, '');
  if (files.has(local.replace(/\.bak.*$/, ''))) return true;
  if (scaffolds.has(local)) return false;
  return /^(?:data|documents|jds|reports|output|interview-prep|writing-samples|\.rebound-ops-web|batch\/tracker-additions)\//.test(local);
}
