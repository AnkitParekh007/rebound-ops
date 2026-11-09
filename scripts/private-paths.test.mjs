import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { isCareerRecord } from './private-paths.mjs';
const root = new URL('../', import.meta.url);

test('ordinary git add excludes user records; forced staging is rejected by release audit', () => {
  assert(isCareerRecord('engine/config/two-pager.yml.bak-2026-11-09'));
  const dir = mkdtempSync(join(tmpdir(), 'rebound-private-git-'));
  const write = (name, text) => { const path = join(dir,name); mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text); };
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  try {
    git('init','-q');
    write('.gitignore', readFileSync(new URL('.gitignore',root),'utf8'));
    write('engine/.gitignore', readFileSync(new URL('engine/.gitignore',root),'utf8'));
    for(const f of ['README.md','LICENSE','SECURITY.md','docs/privacy.md','docs/release-checklist.md'])write(f,'Fictional test repository');
    for(const f of ['scripts/release-audit.mjs','scripts/private-paths.mjs'])write(f,readFileSync(new URL(f,root),'utf8'));
    const privateFiles=['engine/config/two-pager.yml','engine/config/memory.md','engine/config/career-plan.md','engine/config/plugins.yml','engine/config/profile.yml','engine/config/cv-facts.json','engine/cv.md','engine/data/applications.md'];
    for(const f of privateFiles){write(f,'FICTIONAL private record');assert.equal(isCareerRecord(f),true);git('check-ignore',f);}
    write('engine/documents/README.md','System scaffold');write('engine/test-fixtures/cv.md','Fictional tracked fixture');
    git('add','.');const tracked=git('ls-files').split('\n');
    for(const f of privateFiles)assert(!tracked.includes(f),f);
    assert(tracked.includes('engine/documents/README.md'));assert(tracked.includes('engine/test-fixtures/cv.md'));
    assert.equal(spawnSync(process.execPath,['scripts/release-audit.mjs'],{cwd:dir}).status,0);
    git('add','-f','engine/config/two-pager.yml');
    const audit=spawnSync(process.execPath,['scripts/release-audit.mjs'],{cwd:dir,encoding:'utf8'});
    assert.equal(audit.status,1);assert(audit.stderr.includes('engine/config/two-pager.yml'));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
