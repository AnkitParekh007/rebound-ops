import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { parseDrafts } from './publish-discussions.mjs';

test('parse the five prepared ReboundOps launch discussions', () => {
  const document = readFileSync('docs/community-discussions-launch.md', 'utf8');
  const drafts = parseDrafts(document);
  assert.equal(drafts.length, 5);
  assert.deepEqual(drafts.map(d => d.category), ['Announcements', 'General', 'Ideas', 'Q&A', 'Show and tell']);
  assert.match(drafts[0].body, /founder, creator and lead maintainer/i);
  assert.ok(drafts.every(d => d.body.length > 80 && !d.body.includes('**Category:**')));
});

test('reject incomplete or reordered discussion drafts', () => {
  assert.throws(() => parseDrafts('## 1. Welcome\n\n**Category:** Announcements\n\nHi'), /Expected five/);
});
