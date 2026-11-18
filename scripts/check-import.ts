/**
 * Checks an import file without writing anything anywhere.
 *
 *   npm run import:check -- <file.json>
 *
 * Validates the file against the neutral import format (docs/IMPORT_FORMAT.md)
 * or a ReboundOps export, and prints what an import into an empty workspace
 * would add, skip or reject. The file is only read. No database is opened.
 * Exit code: 0 valid, 1 invalid, 2 usage error.
 */
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { Profile } from '@reboundops/contracts';
import { ImportFormatError, planImport } from '@reboundops/importer';

const MAX_BYTES = 12 * 1024 * 1024;
const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run import:check -- <file.json>');
  process.exit(2);
}
const path = resolve(file);
const size = statSync(path).size;
if (size > MAX_BYTES) {
  console.error(`Invalid: the file is ${(size / 1024 / 1024).toFixed(1)} MB; the limit is 12 MB.`);
  process.exit(1);
}
try {
  const plan = planImport(readFileSync(path, 'utf8'), { profile: Profile.parse({}), dedupeKeys: new Set() });
  const { profile, jobs, warnings } = plan.preview;
  console.log(`Valid ${plan.sourceFormat} file (sha256 ${plan.sha256.slice(0, 12)}…).`);
  console.log(`Profile: fills ${profile.fieldsToFill.length} fields, adds ${profile.skillsToAdd.length} skills, ${profile.experienceToAdd} roles, ${profile.educationToAdd} education entries, ${profile.answersToAdd} saved answers (all imported as unverified).`);
  console.log(`Jobs: ${jobs.toAdd.length} to add, ${jobs.duplicates.length} duplicates within the file, ${jobs.rejected.length} rejected.`);
  for (const r of jobs.rejected) console.log(`  rejected #${r.index}: ${r.reason}`);
  for (const w of warnings) console.log(`warning: ${w}`);
  console.log('Nothing was written. Import it from Settings → Import data to see the preview against your own data.');
} catch (err) {
  if (err instanceof ImportFormatError) {
    console.error(`Invalid: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
