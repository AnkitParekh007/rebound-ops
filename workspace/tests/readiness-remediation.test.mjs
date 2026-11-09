import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inferWorkModel, conservativeWorkModel } from '../server/lib/work-model.mjs';
let root, server, base;
before(async()=>{
  root=mkdtempSync(join(tmpdir(),'rebound-ready-'));process.env.REBOUND_OPS_ROOT=root;
  mkdirSync(join(root,'config'));mkdirSync(join(root,'data'));
  writeFileSync(join(root,'cv.md'),'# Fictional engineer\n');
  writeFileSync(join(root,'config','config.yml'),'anthropic_key: do-not-export');
  writeFileSync(join(root,'portals.yml'),'tracked_companies: []\napi_token: private-token\n');
  const {createApp}=await import('../server/index.mjs');await new Promise(resolve=>{server=createApp().listen(0,'127.0.0.1',()=>{base='http://127.0.0.1:'+server.address().port;resolve()})});
});
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(root,{recursive:true,force:true})});
const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('a city is not evidence of onsite work; explicit source descriptions and metadata take precedence',()=>{
  assert.equal(inferWorkModel({location:'Bangalore, India',title:'Backend Engineer'}).workplaceType,'Unknown');
  const remote=inferWorkModel({location:'Bangalore, India',description:'All of our roles are remote, however location eligibility applies.'});
  assert.equal(remote.workplaceType,'Remote');assert.match(remote.workplaceEvidence,/Employer description/);
  assert.equal(inferWorkModel({structured:'Hybrid',location:'Remote, India'}).workplaceType,'Hybrid');
  assert.equal(inferWorkModel({structured:'OnSite'}).workplaceType,'Onsite');
  assert.equal(conservativeWorkModel({workplaceType:'Onsite',location:'Bangalore'}).workplaceType,'Unknown');
});
test('combined workspace export excludes provider configuration and redacts known source credentials',async()=>{
  const data=await(await fetch(base+'/api/workspace/backup')).json();assert.match(data.files['cv.md'],/Fictional/);
  assert.equal(data.files['config/config.yml'],undefined);assert.doesNotMatch(data.files['portals.yml'],/private-token/);
});
test('restore requires a preview hash and refuses traversal, unknown files and symlink paths',async()=>{
  assert.equal((await post('/api/workspace/restore-preview',{files:{'../outside.md':'bad'}})).status,400);
  assert.equal((await post('/api/workspace/restore-preview',{files:{'config/config.yml':'api_key: bad'}})).status,400);
  assert.equal((await post('/api/workspace/restore',{files:{'cv.md':'new'}})).status,400);
  symlinkSync(join(root,'cv.md'),join(root,'config','profile.yml'));
  assert.equal((await post('/api/workspace/restore-preview',{files:{'config/profile.yml':'candidate: {}'}})).status,400);
  rmSync(join(root,'config','profile.yml'));
});
test('stale restore preview cannot overwrite a newly edited CV; reviewed restore writes selected files only',async()=>{
  const files={'cv.md':'# Restored fictional CV\n'};
  const preview=await(await post('/api/workspace/restore-preview',{files})).json();
  writeFileSync(join(root,'cv.md'),'# New edit\n');
  const expectedHashes=Object.fromEntries(preview.files.map(file=>[file.name,file.currentHash]));
  assert.equal((await post('/api/workspace/restore',{files,expectedHashes})).status,409);
  assert.equal(readFileSync(join(root,'cv.md'),'utf8'),'# New edit\n');
  const current=await(await post('/api/workspace/restore-preview',{files})).json();
  assert.equal((await post('/api/workspace/restore',{files,expectedHashes:Object.fromEntries(current.files.map(file=>[file.name,file.currentHash]))})).status,200);
  assert.equal(readFileSync(join(root,'cv.md'),'utf8'),files['cv.md']);
});

test('explicitly adding a supported board creates the first source file on a fresh install',async()=>{
  rmSync(join(root,'portals.yml'),{force:true});
  const response=await post('/api/portals/track',{name:'Fictional First Source',careers_url:'https://job-boards.greenhouse.io/fictional-readiness-board'});
  assert.equal(response.status,200);assert.match(readFileSync(join(root,'portals.yml'),'utf8'),/Fictional First Source/);
});
