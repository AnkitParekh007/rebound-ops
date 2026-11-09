/** Explicit, local-only career backup. Provider settings and arbitrary paths are excluded. */
import { existsSync, lstatSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import { PROJECT_ROOT } from '../paths.mjs';
import { withFileLock, atomicWrite } from '../file-lock.mjs';
import { stripDangerousMarkdown } from '../security.mjs';
import { writeRateLimit } from '../rate-limit.mjs';
const FIXED = ['cv.md', 'config/profile.yml', 'config/two-pager.yml', 'config/memory.md', 'data/applications.md', 'data/pipeline.md', 'portals.yml'];
const allowed = name => typeof name === 'string' && (FIXED.includes(name) || /^(reports|jds)\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,99}\.md$/.test(name));
const digest = text => createHash('sha256').update(text).digest('hex');
const MAX_BYTES = 2 * 1024 * 1024;
function safePath(name) {
  if (!allowed(name)) throw new Error('Unsupported backup path');
  let current = PROJECT_ROOT;
  for (const part of name.split('/')) { current = resolve(current, part); try { if (lstatSync(current).isSymbolicLink()) throw new Error('Symlinked career paths cannot be backed up or restored'); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  return current;
}
const credentialKey = key => /(?:^|_)(?:api_key|apikey|key|token|secret|password|auth|authorization|cookie|credentials?)(?:_|$)/i.test(String(key).replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-.\s]/g, '_'));
function sanitizeSources(value, key = '') {
  if (credentialKey(key)) return '[redacted — reconfigure locally]';
  if (Array.isArray(value)) return value.map(item => sanitizeSources(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,sanitizeSources(v,k)]));
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    const url = new URL(value); url.username = ''; url.password = '';
    for (const k of [...url.searchParams.keys()]) if (credentialKey(k)) url.searchParams.set(k, '[redacted]');
    return url.href;
  }
  return value;
}
function read(name) { const path = safePath(name); return existsSync(path) ? readFileSync(path, 'utf8') : null; }
function validate(files) {
  if (!files || typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length > 207) throw new Error('Invalid backup file list');
  if (Buffer.byteLength(JSON.stringify(files)) > MAX_BYTES) throw new Error('Backup exceeds 2 MB');
  for (const [name, text] of Object.entries(files)) {
    safePath(name);
    if (typeof text !== 'string' || Buffer.byteLength(text) > 512 * 1024) throw new Error('Invalid or oversized file: ' + name);
    if (name.endsWith('.yml')) { const parsed = yaml.load(text); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected YAML settings object: ' + name); }
  }
  return Object.fromEntries(Object.entries(files).map(([name,text])=>[name,name.endsWith('.md')?stripDangerousMarkdown(text):text]));
}
export function registerWorkspaceBackupRoutes(app) {
  app.get('/api/workspace/backup', (_req,res) => {
    try {
      const names = [...FIXED];
      for (const directory of ['reports','jds']) {
        const path = resolve(PROJECT_ROOT,directory);
        if (existsSync(path)) {
          if (lstatSync(path).isSymbolicLink()) throw new Error('Symlinked career directories cannot be backed up');
          names.push(...readdirSync(path).filter(name => allowed(directory+'/'+name)).slice(0,100).map(name => directory+'/'+name));
        }
      }
      const files = {};
      for (const name of names) { const text = read(name); if (text !== null) files[name] = name === 'portals.yml' ? yaml.dump(sanitizeSources(yaml.load(text) || {})) : text; }
      validate(files);
      res.set('Cache-Control','no-store').json({ files, notice: 'Private plaintext career records. Provider settings, generated PDFs and browser data are excluded. Known source credentials are redacted; review your backup before sharing. Up to 100 reports and 100 job descriptions are included.' });
    } catch (error) { res.status(422).json({ error: error.message }); }
  });
  app.post('/api/workspace/restore-preview', writeRateLimit(), (req,res) => {
    try { const files=validate(req.body?.files); res.set('Cache-Control','no-store').json({ files:Object.keys(files).map(name => { const text=read(name); return {name,exists:text!==null,currentHash:text===null?null:digest(text)}; }) }); }
    catch(error) { res.status(400).json({error:error.message}); }
  });
  app.post('/api/workspace/restore', writeRateLimit(), async (req,res) => {
    const written=[];
    try {
      const files=validate(req.body?.files), hashes=req.body?.expectedHashes;
      if (!hashes || typeof hashes !== 'object' || Object.keys(files).some(name => !Object.hasOwn(hashes,name))) throw new Error('Preview and explicitly select files before restoring');
      const names=Object.keys(files).sort();
      const lock = index => index===names.length ? apply() : withFileLock(safePath(names[index]),()=>lock(index+1));
      function apply() {
        for (const name of names) { const text=read(name); if ((text===null?null:digest(text))!==hashes[name]) { const error=new Error('A file changed after preview; review again: '+name); error.status=409; throw error; } }
        for (const name of names) { const path=safePath(name); mkdirSync(dirname(path),{recursive:true}); atomicWrite(path,files[name]); written.push(name); }
      }
      await lock(0);res.json({written});
    } catch(error) { res.status(error.status || 400).json({error:error.message,written}); }
  });
}
