/* global window */
/**
 * ReboundOps Next — integration state shared by the recovery views and the
 * context strip on ReboundOps views.
 *
 * Holds ONLY a non-sensitive handoff summary: the ReboundOps session id (a
 * memory-only session on the local API), the chosen goal key, the selected
 * direction and the next action title. The intake and achievements stay in
 * the ReboundOps API; nothing here is written to the ReboundOps parent
 * project. sessionStorage is used so a page refresh keeps the handoff; it is
 * cleared when the tab closes.
 */
window.ReboundState = (function () {
  const KEY = 'reboundops:handoff';
  const VISITED = 'reboundops:visited';
  const listeners = new Set();
  let state = read();

  function read() {
    try {
      const raw = window.sessionStorage.getItem(KEY);
      const v = raw ? JSON.parse(raw) : null;
      return v && typeof v === 'object' ? v : {};
    } catch { return {}; }
  }
  function write() {
    try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  }

  const GOALS = {
    direction: { label: 'Regain direction after a setback', route: null },
    similar: { label: 'Find a similar role', route: 'return' },
    adjacent: { label: 'Move into an adjacent or new field', route: 'shift' },
    bridge: { label: 'Find a stepping-stone or contract role', route: 'bridge' },
    known: { label: 'I already know my target', route: null },
  };
  // Mirrors ROUTE_TITLES in @reboundops/contracts (plain-language names).
  const ROUTE_TITLES = { return: 'Similar work to before', shift: 'A new kind of work', bridge: 'A stepping-stone role' };

  /** Derive the strip summary from a real session returned by the API. */
  function fromSession(session) {
    if (!session || !session.id) return;
    const plan = session.plan;
    const route = plan ? session.routes.find((r) => r.id === plan.routeId) : null;
    const next = plan ? plan.actions.find((a) => !a.completed) : null;
    state = {
      ...state,
      sessionId: session.id,
      routeId: route ? route.id : null,
      routeTitle: route ? ROUTE_TITLES[route.id] : null,
      target: route ? route.target : null,
      nextAction: next ? { day: next.day, title: next.title, minutes: next.minutes } : null,
      planDone: Boolean(plan && plan.actions.length && !next),
    };
    write();
    emit();
  }

  function set(patch) { state = { ...state, ...patch }; write(); emit(); }
  function clear() { state = {}; try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ } emit(); }
  function get() { return { ...state }; }
  function emit() { for (const fn of listeners) { try { fn(get()); } catch (e) { console.error(e); } } }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function markVisited() { try { window.localStorage.setItem(VISITED, '1'); } catch { /* ignore */ } }
  function hasVisited() { try { return window.localStorage.getItem(VISITED) === '1'; } catch { return false; } }

  /**
   * Same-origin call to the ReboundOps UI bridge (never to the Fastify port),
   * through the shared API.* client (connection banner, error shaping). Errors
   * are returned, not thrown, so views can handle 409 revision conflicts.
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

  return { get, set, clear, fromSession, subscribe, markVisited, hasVisited, call, GOALS, ROUTE_TITLES };
})();
