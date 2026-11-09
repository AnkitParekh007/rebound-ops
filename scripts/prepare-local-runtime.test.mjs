import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareDependencies, prepareBrowser } from './prepare-local-runtime.mjs';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'rebound-runtime-'));
  writeFileSync(join(dir, 'package.json'), '{"name":"rebound-ops-engine"}');
  writeFileSync(join(dir, 'package-lock.json'), '{"lockfileVersion":3}');
  return dir;
}
test('runtime repairs first, changed-lock and incomplete installs; valid installs are reused', () => {
  const dir = fixture(); const calls = []; let complete = true;
  const run = (_program, args) => {
    calls.push(args);
    if (args[0] === 'ci') { mkdirSync(join(dir, 'node_modules'), { recursive: true }); complete = true; }
    return args[0] !== 'ls' || complete;
  };
  try {
    prepareDependencies(dir, { run });
    assert.equal(calls.filter(a => a[0] === 'ci').length, 1);
    assert(calls.find(a => a[0] === 'ci').includes('--ignore-scripts'));
    prepareDependencies(dir, { run });
    assert.equal(calls.filter(a => a[0] === 'ci').length, 1);
    writeFileSync(join(dir, 'package-lock.json'), '{"lockfileVersion":3,"updated":true}');
    prepareDependencies(dir, { run });
    assert.equal(calls.filter(a => a[0] === 'ci').length, 2);
    complete = false;
    prepareDependencies(dir, { run });
    assert.equal(calls.filter(a => a[0] === 'ci').length, 3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('runtime stops after an installation failure or missing lock', () => {
  const dir = fixture();
  try {
    assert.throws(() => prepareDependencies(dir, { run: () => false }), /installation failed/);
    rmSync(join(dir, 'package-lock.json'));
    assert.throws(() => prepareDependencies(dir), /complete checkout/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('browser is actually launched and closed; failed launches stop startup', async () => {
  const dir = fixture(); const executable = join(dir, 'fixture-chrome'); writeFileSync(executable, 'fictional');
  let closed = false;
  try {
    await prepareBrowser(dir, { env: { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: executable }, load: async () => ({ launch: async () => ({ close: async () => { closed = true; } }) }) });
    assert(closed);
    await assert.rejects(prepareBrowser(dir, { env: { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: executable }, load: async () => ({ launch: async () => { throw Error('missing host libraries'); } }) }), /could not start/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a missing browser installs through the locked Playwright CLI and then verifies launch', async () => {
  const dir=fixture();const pkg=join(dir,'node_modules','playwright');mkdirSync(pkg,{recursive:true});
  writeFileSync(join(pkg,'package.json'),'{"name":"playwright","exports":{".":"./index.js"}}');
  writeFileSync(join(pkg,'index.js'),'');writeFileSync(join(pkg,'cli.js'),'');
  const executable=join(dir,'downloaded-browser');let verified=false;
  try {
    await prepareBrowser(dir,{env:{},load:async()=>({executablePath:()=>executable,launch:async()=>{assert.equal(readFileSync(executable,'utf8'),'downloaded');verified=true;return {close:async()=>{}};}}),run:(program,args)=>{
      assert.equal(program,process.execPath);assert.deepEqual(args,[join(pkg,'cli.js'),'install','chromium']);writeFileSync(executable,'downloaded');return true;
    }});
    assert(verified);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('browser preflight loads the installed CommonJS Playwright package', async () => {
  const dir=fixture(),pkg=join(dir,'node_modules','playwright');mkdirSync(pkg,{recursive:true});
  writeFileSync(join(pkg,'package.json'),'{"name":"playwright","main":"index.js"}');
  writeFileSync(join(pkg,'index.js'),'module.exports = { chromium: { launch: async () => ({ close: async () => {} }) } };');
  const executable=join(dir,'fixture-browser');writeFileSync(executable,'fixture');
  try {await prepareBrowser(dir,{env:{PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:executable}});}
  finally{rmSync(dir,{recursive:true,force:true});}
});
