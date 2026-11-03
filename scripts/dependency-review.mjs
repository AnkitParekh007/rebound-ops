/**
 * Inspect the actual npm lockfile and advisory responses.
 * This is an automated triage aid, not a legal opinion or security certification.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function fail(msg) { console.error('[dependency-review] ' + msg); process.exitCode = 1; }
let lock;
try {
  lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
} catch {
  fail('Missing or unreadable root package-lock.json');
  process.exit();
}
if (lock.lockfileVersion !== 3 || !lock.packages || !lock.packages['']) {
  fail('Expected npm workspace lockfile version 3');
  process.exit();
}

const licenses = new Map();
const review = [];
const unknown = [];
let scanned = 0;
let missingOnPlatform = 0;
let licenseFromInstalled = 0;
const cautionPattern = /\b(?:AGPL|GPL|LGPL|SSPL|BUSL|EPL|MPL|CPAL|OSL|CC-BY-NC|Commons-Clause)\b/i;
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location.includes('node_modules/') || entry.link) continue;
  scanned++;
  let expression = entry.license;
  const manifest = join(process.cwd(), location, 'package.json');
  if (!expression && existsSync(manifest)) {
    try {
      expression = JSON.parse(readFileSync(manifest, 'utf8')).license;
      licenseFromInstalled++;
    } catch { /* flag missing or malformed metadata below */ }
  }
  if (!existsSync(manifest)) missingOnPlatform++;
  expression = typeof expression === 'string' ? expression.trim() : '';
  licenses.set(expression || '(not declared)', (licenses.get(expression || '(not declared)') ?? 0) + 1);
  if (!expression || /^(?:SEE LICENSE|UNLICENSED|UNKNOWN)$/i.test(expression)) {
    unknown.push(location);
  } else if (cautionPattern.test(expression)) {
    review.push({ location, license: expression });
  }
}
console.log('[dependency-review] npm lockfile v' + lock.lockfileVersion +
  '; ' + scanned + ' pinned dependency locations; ' +
  missingOnPlatform + ' absent on this OS (commonly optional); ' +
  licenseFromInstalled + ' licenses read from installed package manifests.');
console.log('[dependency-review] SPDX/license expressions: ' +
  [...licenses.entries()].sort((a,b)=>b[1]-a[1]).map(([name,count])=>name+': '+count).join('; '));
console.log('[dependency-review] Missing/ambiguous license declarations: ' + unknown.length);
if (unknown.length) console.log('[dependency-review] Review unknown licenses: ' + unknown.slice(0,25).join(', ') +
  (unknown.length>25 ? ' (more omitted)' : ''));
console.log('[dependency-review] Licenses needing manual obligations review: ' + review.length);
if (review.length) console.log('[dependency-review] Review: ' + review.slice(0,25).map(x=>x.location+' ['+x.license+']').join('; ') +
  (review.length>25 ? ' (more omitted)' : ''));

function summarizeAudit(label, path) {
  if (!path) { fail('Missing ' + label + ' audit file argument'); return null; }
  let payload;
  try { payload = JSON.parse(readFileSync(path, 'utf8')); }
  catch { fail('Unreadable ' + label + ' npm audit JSON'); return null; }
  if (!payload.metadata?.vulnerabilities) {
    fail('No advisory totals returned for ' + label + ' (registry query may have failed)');
    return null;
  }
  const counts = payload.metadata.vulnerabilities;
  const total = Number(counts.total ?? 0);
  const critical = Number(counts.critical ?? 0);
  const high = Number(counts.high ?? 0);
  const moderate = Number(counts.moderate ?? 0);
  const low = Number(counts.low ?? 0);
  console.log('[dependency-review] ' + label +
    ' advisories: total=' + total + ' critical=' + critical +
    ' high=' + high + ' moderate=' + moderate + ' low=' + low);
  const items = Object.entries(payload.vulnerabilities ?? {})
    .filter(([,v]) => v.severity === 'high' || v.severity === 'critical')
    .map(([name,v])=> name + ' (' + v.severity + (v.isDirect ? ',direct':'') +
         ', fix=' + (typeof v.fixAvailable === 'object' ? 'major/explicit' : String(v.fixAvailable)) + ')');
  if (items.length) console.log('[dependency-review] ' + label + ' high/critical packages: ' + items.join(', '));
  return { total, critical, high, moderate, low };
}
const production = summarizeAudit('production', process.argv[2]);
summarizeAudit('all dependencies', process.argv[3]);
if (production && production.high + production.critical > 0) {
  fail('High/critical production advisories require resolution before merging.');
}
if (unknown.length || review.length) {
  console.log('[dependency-review] Manual license research remains required for flagged entries.');
}
console.log('[dependency-review] This check does not independently assess source code or full license terms.');
