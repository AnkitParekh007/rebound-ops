import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/js/views/workbench.js', import.meta.url), 'utf8');
function fixture({ rows = [], fail = false, session = null } = {}) {
  const legacy = () => 'legacy';
  const routes = { dashboard: legacy };
  const h = (tag, props = {}, children = []) => ({ tag, props, children: [].concat(children), append(...items) { this.children.push(...items); } });
  vm.runInNewContext(source, {
    Router: { renderer: name => routes[name], register: (name, fn) => routes[name] = fn },
    Journey: { h, icon: () => h('svg'), duration: minutes => `${minutes} min` },
    ReboundState: { hasSession: () => !!session, session: () => session, summary: () => session ? { target: 'Support engineering', next: { title: 'Check one achievement', minutes: 20 } } : null },
    API: { get: async () => { if (fail) throw new Error('offline'); return { rows }; } },
  });
  return { routes, legacy };
}
function text(node) { return typeof node === 'string' ? node : [node.props?.text || '', ...(node.children || []).filter(Boolean).map(text)].join(' '); }
test('workbench uses recorded statuses, preserves advanced tooling and never predicts outcomes', async () => {
  const { routes, legacy } = fixture({ rows: [{ company: 'Example', role: 'Support', status: 'Interview' }, { status: 'Rejected' }] });
  assert.equal(routes['tools-dashboard'], legacy);
  const content = text(await routes.dashboard());
  assert(content.includes('1 open application records'));
  assert(content.includes('1 records marked'));
  assert(content.includes('A search with a direction.'));
  assert(content.includes('not predicted outcomes') || content.includes('not a hiring prediction'));
});
test('unavailable records are never reported as an empty working set', async () => {
  const { routes } = fixture({ fail: true });
  const content = text(await routes.dashboard());
  assert(content.includes('Records unavailable'));
  assert(!content.includes('No open application records yet'));
  assert(!content.includes('0 open application records'));
});
test('recovery evidence remains explicitly self-reviewed without promotional credits', async () => {
  const { routes } = fixture({ session: { intake: { evidence: [{ status: 'confirmed' }, { status: 'unverified' }] } } });
  const content = text(await routes.dashboard());
  assert(content.includes('1 of 2 achievements confirmed'));
  assert(content.includes('not independent verification'));
  assert(content.includes('Check one achievement'));
  assert.equal(routes.credits, undefined);
  assert(!/career-?ops|rebound-ops/i.test(content));
});
