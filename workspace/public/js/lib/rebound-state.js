/* global window */
/**
 * ReboundOps — journey state shared by the recovery views, the journey
 * navigation and the next-step panel on job-search screens.
 *
 * Privacy model (tested in scripts/reboundops-smoke.mjs):
 *  - sessionStorage holds ONLY a reference: the session id on the local
 *    ReboundOps API, the goal key the person picked and the route that goal
 *    suggests. No role, priorities, location, targets or achievement text.
 *  - The session itself (which does contain that text) is fetched from the
 *    API and kept in page memory only (`cache`). A reload fetches it again.
 *  - The onboarding draft lives in the start view's own memory, never here.
 *  - localStorage holds two non-personal flags: "has seen the start screen"
 *    and "prefers to go straight to job-search tools".
 */
window.ReboundState = (function () {
  const KEY = 'reboundops:handoff';
  const VISITED = 'reboundops:visited';
  const PREFERS_TOOLS = 'reboundops:prefers-tools';
  const ALLOWED = ['sessionId', 'goal', 'suggestedRoute'];
  const listeners = new Set();
  let ref = read();
  let cache = null; // the full session object, memory only

  function read() {
    try {
      const raw = window.sessionStorage.getItem(KEY) || window.localStorage.getItem(KEY);
      const v = raw ? JSON.parse(raw) : null;
      const out = {};
      if (v && typeof v === 'object') for (const k of ALLOWED) if (typeof v[k] === 'string') out[k] = v[k];
      return out;
    } catch { return {}; }
  }
  function write() {
    const out = {};
    for (const k of ALLOWED) if (typeof ref[k] === 'string' && ref[k]) out[k] = ref[k];
    try {
      if (Object.keys(out).length) window.sessionStorage.setItem(KEY, JSON.stringify(out));
      else window.sessionStorage.removeItem(KEY);
    } catch { /* private mode: the journey still works within this page */ }
  }

  // Goal choices (keys are stable; labels are what people read).
  const GOALS = {
    similar: { label: 'Find similar work', line: 'Use what you have already proven, in a role like your last one.', route: 'return' },
    new: { label: 'Explore a new direction', line: 'Test an adjacent field before you commit to it.', route: 'shift' },
    income: { label: 'Earn income while I regroup', line: 'A stepping-stone or contract role that buys you time.', route: 'bridge' },
    known: { label: 'I know my target role', line: 'Plan around that target, or go straight to job search.', route: null },
    unsure: { label: "I'm not sure yet", line: 'Compare three directions side by side first.', route: null },
  };
  // Mirrors ROUTE_TITLES in @reboundops/contracts (plain-language names).
  const ROUTE_TITLES = { return: 'Similar work to before', shift: 'A new kind of work', bridge: 'A stepping-stone role' };
  // buildRoutes() fills a missing shift/bridge target with these placeholders.
  const PLACEHOLDER_TARGETS = ['Adjacent software role (to define)', 'Scoped contract work (to define)'];

  function setSession(session) {
    if (!session || !session.id) return;
    cache = session;
    ref = { ...ref, sessionId: session.id };
    write();
    try {
      if (session.persistence === 'disk') window.localStorage.setItem(KEY, JSON.stringify({ sessionId: session.id }));
      else window.localStorage.removeItem(KEY);
    } catch { /* Saving on the server still works without browser storage. */ }
    emit();
  }
  function forgetSession() { try { window.localStorage.removeItem(KEY); } catch {} cache = null; ref = { ...ref, sessionId: undefined }; write(); emit(); }
  function setGoal(goal) {
    if (!GOALS[goal]) return;
    ref = { ...ref, goal, suggestedRoute: GOALS[goal].route || undefined };
    write(); emit();
  }
  function get() { return { ...ref }; }
  function session() { return cache; }
  function hasSession() { return Boolean(ref.sessionId); }

  /** A display summary derived from the cached session (memory only). */
  function summary() {
    const s = cache;
    if (!s) return null;
    const plan = s.plan;
    const route = plan ? s.routes.find((r) => r.id === plan.routeId) : null;
    const next = plan ? plan.actions.find((a) => !a.completed) : null;
    return {
      goal: ref.goal || null,
      routeId: route ? route.id : null,
      routeTitle: route ? ROUTE_TITLES[route.id] : null,
      target: route && !PLACEHOLDER_TARGETS.includes(route.target) ? route.target : null,
      next: next || null,
      done: plan ? plan.actions.filter((a) => a.completed).length : 0,
      total: plan ? plan.actions.length : 0,
    };
  }

  function emit() { for (const fn of listeners) { try { fn(); } catch (e) { console.error(e); } } }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function markVisited() { try { window.localStorage.setItem(VISITED, '1'); } catch { /* ignore */ } }
  function hasVisited() { try { return window.localStorage.getItem(VISITED) === '1'; } catch { return false; } }
  function setPrefersTools(on) {
    try { if (on) window.localStorage.setItem(PREFERS_TOOLS, '1'); else window.localStorage.removeItem(PREFERS_TOOLS); } catch { /* ignore */ }
  }
  function prefersTools() { try { return window.localStorage.getItem(PREFERS_TOOLS) === '1'; } catch { return false; } }

  /**
   * Same-origin call to the allowlisted bridge (never to the API port), via
   * the shared API.* client. Errors are returned, not thrown, so views can
   * handle 409 revision conflicts and the offline state.
   */
  async function call(method, path, body) {
    const url = '/api/rebound' + path;
    try {
      let data;
      if (method === 'GET' && path.endsWith('/export')) data = await window.API.getText(url);
      else if (method === 'GET') data = await window.API.get(url);
      else if (method === 'POST') data = await window.API.post(url, body);
      else if (method === 'PUT') data = await window.API.put(url, body);
      else throw new Error('unsupported method');
      return { ok: true, status: 200, data };
    } catch (err) {
      if (err && err.network) return { ok: false, status: 0, data: { error: 'RECOVERY_SERVICE_OFFLINE' } };
      return { ok: false, status: (err && err.status) || 500, data: (err && err.data) || { error: 'REQUEST_FAILED', message: err && err.message } };
    }
  }

  /** Fetch the referenced session into memory. Returns { ok, status, data }. */
  async function load() {
    if (!ref.sessionId) return { ok: false, status: 404, data: { error: 'NO_SESSION' } };
    const r = await call('GET', `/sessions/${ref.sessionId}`);
    if (r.ok) setSession(r.data);
    else if (r.status === 404) forgetSession();
    return r;
  }

  async function dataControls() {
    const h = window.Journey.h;
    const box = h('section', { className: 'rj-snapshot', 'aria-label': 'Save and resume recovery' });
    const say = h('p', { role: 'status', 'aria-live': 'polite' });
    const current = session();
    box.append(h('h2', { text: 'Save and resume' }), h('p', { text: current?.persistence === 'disk' ? 'Saved on this computer after every change.' : 'Memory only: recovery work ends when the app stops. Download a restorable backup or choose local saving.' }));
    if (current) {
      box.append(h('button', { type: 'button', className: 'rj-btn', text: current.persistence === 'disk' ? 'Turn off local saving' : 'Save on this computer', onclick: async () => {
        const mode = session().persistence === 'disk' ? 'memory' : 'disk';
        if (!await window.Journey.confirm({ title: mode === 'disk' ? 'Save recovery on this computer?' : 'Remove the saved local copy?', body: [mode === 'disk' ? 'Your career answers will be stored as plaintext in your private local data folder. Anyone with access to your account can read them.' : 'The session remains in memory until the app stops. Download a backup first if you want to keep it.'], confirmLabel: 'Confirm', cancelLabel: 'Cancel' })) return;
        const s = session();
        const r = await call('PUT', `/sessions/${s.id}/persistence`, { expectedRevision: s.revision, mode });
        if (r.ok) { setSession(r.data); window.Router.render(); } else say.textContent = window.Journey.errorText(r);
      } }));
      box.append(h('button', { type: 'button', className: 'rj-btn', text: 'Download backup (JSON)', onclick: async () => {
        const latest = await load(); if (!latest.ok) { say.textContent = window.Journey.errorText(latest); return; }
        const url = URL.createObjectURL(new Blob([JSON.stringify(latest.data, null, 2)], { type: 'application/json' }));
        const a = h('a', { href: url, download: 'reboundops-backup.json' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        say.textContent = 'Backup downloaded. It contains personal career data; store it privately.';
      } }));
    }
    box.append(h('button', { type: 'button', className: 'rj-btn', text: 'Download combined career backup', onclick: async () => {
      try {
        if (hasSession()) { const latest = await load(); if (!latest.ok) { say.textContent = window.Journey.errorText(latest); return; } }
        const workspace = await window.API.get('/api/workspace/backup');
        if (!await window.Journey.confirm({ title: 'Download private career records?', body: [workspace.notice, 'The download includes this recovery session, CV, profile, preferences, tracker, source configuration, reports and job descriptions. Keep the plaintext file outside Git and shared folders.'], confirmLabel: 'Download private backup', cancelLabel: 'Cancel' })) return;
        const payload = { format: 'reboundops-combined-backup', version: 1, recovery: session(), workspace: workspace.files };
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const a = h('a', { href: url, download: 'reboundops-combined-backup.json' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        say.textContent = 'Combined backup downloaded. Provider key settings and generated PDFs are excluded.';
      } catch (error) { say.textContent = error.message || 'Could not create backup.'; }
    } }));
    const file = h('input', { type: 'file', accept: '.json,application/json', onchange: async () => {
      const f = file.files?.[0]; if (!f) return;
      if (f.size > 2500 * 1024) { say.textContent = 'Choose a backup smaller than 2.5 MB.'; return; }
      try {
        const backup = JSON.parse(await f.text());
        if (backup?.format === 'reboundops-combined-backup') {
          if (backup.version !== 1) throw new Error('Unsupported combined backup version');
          const preview = await window.API.post('/api/workspace/restore-preview', { files: backup.workspace });
          const content = h('div');
          content.append(h('p', { text: 'Select files to restore. Existing files start unselected. Selecting one explicitly replaces it; a changed file will require a new preview. Recovery restores with a new ID and starts in memory only.' }));
          const chosen = [];
          for (const item of preview.files) {
            const checkbox = h('input', { type: 'checkbox', checked: !item.exists });
            chosen.push({ ...item, checkbox }); content.append(h('label', {}, [checkbox, item.name + (item.exists ? ' — replace existing file' : ' — create new file')]));
          }
          const recover = h('input', { type: 'checkbox', checked: Boolean(backup.recovery) });
          const large = backup.recovery && JSON.stringify({session:backup.recovery}).length > 60 * 1024;
          if (large) { recover.checked = false; recover.disabled = true; content.append(h('p', { text: 'This recovery snapshot exceeds the workspace bridge limit. Extract it below and restore it using the full recovery interface. Workspace files can be restored separately.' })); }
          content.append(h('label', {}, [recover, 'Restore the recovery session as a new memory-only session']));
          if (backup.recovery) content.append(h('button', { type: 'button', className: 'rj-btn', text: 'Extract recovery JSON', onclick: () => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(backup.recovery)], { type:'application/json' })); const a=h('a',{href:url,download:'reboundops-recovery.json'}); document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
          } }));
          const message = h('p', { role: 'status' });
          const apply = h('button', { type: 'button', className: 'rj-btn', text: 'Restore selected records', onclick: async () => {
            apply.disabled = true;
            try {
              const selected = chosen.filter(item => item.checkbox.checked);
              if (!selected.length && !recover.checked) { message.textContent = 'Select records to restore.'; return; }
              // Validate recovery first, then write workspace files. A restore never replaces the original session.
              let restored = null;
              if (recover.checked) { const result=await call('POST','/sessions/restore',{session:backup.recovery}); if (!result.ok) { message.textContent=window.Journey.errorText(result);return; } restored=result.data; }
              if (selected.length) await window.API.post('/api/workspace/restore', { files:Object.fromEntries(selected.map(item=>[item.name,backup.workspace[item.name]])),expectedHashes:Object.fromEntries(selected.map(item=>[item.name,item.currentHash])) });
              if (restored) setSession(restored);
              window.UI.closeModal(); window.Router.go('/recovery'); window.Router.render();
            } catch(error) { message.textContent = (error.message || 'Restore failed.') + ' Review again before retrying. A recovery copy may have been created; original sessions remain available.'; }
            finally { apply.disabled=false; }
          } });
          content.append(apply,message);window.UI.modal('Review combined backup restore',content);return;
        }
        if (f.size > 60 * 1024) { say.textContent = 'Restore this recovery backup in the full recovery interface; it exceeds the workspace bridge limit.'; return; }
        const r = await call('POST', '/sessions/restore', { session: backup });
        if (!r.ok) { say.textContent = window.Journey.errorText(r); return; }
        setSession(r.data); window.Router.go('/recovery'); window.Router.render();
      } catch { say.textContent = 'Choose a valid ReboundOps JSON backup.'; }
    } });
    box.append(h('label', {}, ['Restore a recovery or combined JSON backup (recovery starts in memory only)', file]));
    const saved = await call('GET', '/sessions/saved');
    if (saved.ok) for (const item of saved.data) box.append(h('button', { type: 'button', className: 'rj-btn', text: `Resume ${item.role} · ${new Date(item.updatedAt).toLocaleDateString()}`, onclick: async () => {
      const r = await call('GET', `/sessions/${item.id}`); if (r.ok) { setSession(r.data); window.Router.go('/recovery'); window.Router.render(); } else say.textContent = window.Journey.errorText(r);
    } }));
    const runtime = await call('GET', '/runtime');
    if (runtime.ok) {
      const target = new URL(runtime.data.recoveryUrl);
      if (target.protocol === 'http:' && target.hostname === '127.0.0.1') {
        if (current) { target.searchParams.set('session', current.id); target.hash = current.plan ? 'plan' : 'evidence'; }
        box.append(h('a', { className: 'rj-btn', href: target.href, target: '_blank', rel: 'noopener noreferrer', text: 'Open full recovery: evidence, check-in and data controls' }));
      }
    }
    box.append(say); return box;
  }

  return {
    dataControls, get, session, hasSession, setSession, forgetSession, setGoal, summary, load, call,
    subscribe, markVisited, hasVisited, setPrefersTools, prefersTools,
    GOALS, ROUTE_TITLES, PLACEHOLDER_TARGETS,
  };
})();
