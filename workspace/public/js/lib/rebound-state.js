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
      const raw = window.sessionStorage.getItem(KEY);
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
    write(); emit();
  }
  function forgetSession() { cache = null; ref = { ...ref, sessionId: undefined }; write(); emit(); }
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

  return {
    get, session, hasSession, setSession, forgetSession, setGoal, summary, load, call,
    subscribe, markVisited, hasVisited, setPrefersTools, prefersTools,
    GOALS, ROUTE_TITLES, PLACEHOLDER_TARGETS,
  };
})();
