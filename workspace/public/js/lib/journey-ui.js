/* global window, document, Router, ReboundState */
/**
 * ReboundOps journey UI — shared helpers, icons and chrome for the recovery
 * journey (start, next step, directions, opportunities, evidence).
 *
 *  - h(): DOM builder; text always goes through textContent (no innerHTML).
 *  - icon(): ReboundOps' own stroke icons (drawn for this project).
 *  - Journey mode: on journey routes the tool chrome (search bar, AI-key
 *    banner, docs chat) is hidden; it stays on job-search tool screens.
 *  - Navigation: "Your recovery" links above the existing tools, which
 *    collapse under "Tools & settings"; a bottom bar on small screens.
 *  - Next-step panel: a quiet reminder on tool screens, built from the
 *    session held in memory (never from browser storage).
 */
window.Journey = (function () {
  const RS = window.ReboundState;
  const JOURNEY_ROUTES = ['start', 'recovery', 'directions', 'opportunities', 'evidence', 'dashboard'];
  const NS = 'http://www.w3.org/2000/svg';

  function h(tag, props, children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'className') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children || [])) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  // 24×24 stroke icons, drawn for ReboundOps (paths only, currentColor).
  const ICONS = {
    next: ['M4 20c3-4 6-4 8-8s5-6 8-6', 'M17 3v6', 'M17 3h4l-1.5 1.5L21 6h-4'],
    directions: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', 'M15.5 8.5l-2 5-5 2 2-5z'],
    opportunities: ['M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13', 'M15.5 15.5L20 20'],
    applications: ['M7 3h7l4 4v14H7z', 'M14 3v4h4', 'M10 12h5', 'M10 16h5'],
    evidence: ['M6 7h4v4c0 3-1.5 5-4 6', 'M14 7h4v4c0 3-1.5 5-4 6'],
    more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
    return: ['M9 7H5V3', 'M5 7a8 8 0 1 1-1 6'],
    shift: ['M6 21V3', 'M6 13a5 5 0 0 1 5-5h7', 'M15 5l3 3-3 3'],
    bridge: ['M3 18a2.5 1.2 0 1 0 5 0a2.5 1.2 0 1 0-5 0', 'M9.5 13a2.5 1.2 0 1 0 5 0a2.5 1.2 0 1 0-5 0', 'M16 8a2.5 1.2 0 1 0 5 0a2.5 1.2 0 1 0-5 0'],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    lock: ['M7 11V8a5 5 0 0 1 10 0v3', 'M5 11h14v10H5z'],
    theme: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
    tools: ['M4 7h10', 'M18 7h2', 'M4 17h4', 'M12 17h8', 'M16 5v4', 'M10 15v4'],
    arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  };
  function icon(name, size) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', String(size || 20)); s.setAttribute('height', String(size || 20));
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', name === 'more' ? '3' : '1.8');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.classList.add('rj-icon');
    for (const d of ICONS[name] || []) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.append(p); }
    return s;
  }

  /** 200 → "3h 20m", 45 → "45 min", 240 → "4h". */
  function duration(min) {
    const m = Math.max(0, Math.round(min));
    if (m < 60) return `${m} min`;
    const hh = Math.floor(m / 60), mm = m % 60;
    return mm ? `${hh}h ${mm}m` : `${hh}h`;
  }
  const URGENCY = { soon: 'Soon — within a few weeks', quarter: 'Within the next three months', flexible: 'Flexible — I have some time' };

  function errorText(r) {
    const d = r && r.data;
    if (!r || r.status === 0 || (d && (d.error === 'RECOVERY_SERVICE_OFFLINE' || d.error === 'RECOVERY_SERVICE_TIMEOUT'))) {
      return 'The ReboundOps recovery service is not running. Start it with scripts/start-demo.sh from the rebound-ops folder, then try again. Job-search tools still work on their own.';
    }
    if (d && d.error === 'STALE_REVISION') return 'Your plan changed in another tab. It has been refreshed with the latest version — please try again.';
    if (d && d.error === 'SESSION_NOT_FOUND') return 'This plan is no longer available. Plans are kept in memory only, so they end when ReboundOps restarts.';
    if (d && Array.isArray(d.issues)) return 'Please check: ' + d.issues.map((i) => i.message).join('; ');
    if (d && d.message) return String(d.message);
    return 'Something went wrong. Please try again.';
  }

  /** Accessible confirm dialog (native <dialog>). Resolves true/false. */
  function confirm({ title, body, confirmLabel, cancelLabel }) {
    return new Promise((resolve) => {
      const titleId = 'rj-dlg-' + Math.random().toString(36).slice(2);
      const dlg = h('dialog', { className: 'rj-dialog', 'aria-labelledby': titleId }, [
        h('h2', { id: titleId, className: 'rj-dialog__title', text: title }),
        ...[].concat(body).map((p) => h('p', { text: p })),
        h('div', { className: 'rj-actions' }, [
          h('button', { type: 'button', className: 'rj-btn rj-btn--primary', 'data-v': 'yes', text: confirmLabel }),
          h('button', { type: 'button', className: 'rj-btn rj-btn--quiet', 'data-v': 'no', text: cancelLabel || 'Cancel' }),
        ]),
      ]);
      const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
      dlg.addEventListener('click', (e) => { const v = e.target.closest && e.target.closest('[data-v]'); if (v) done(v.dataset.v === 'yes'); });
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
      document.body.append(dlg);
      dlg.showModal();
      dlg.querySelector('[data-v="no"]').focus();
    });
  }

  /** Polite status line for screen readers and sighted users alike. */
  function status() { return h('p', { className: 'rj-status', role: 'status', 'aria-live': 'polite' }); }

  /** Journey page header: eyebrow + heading + quiet utilities (theme, tools). */
  function header(eyebrow, title, lede) {
    return h('header', { className: 'rj-header' }, [
      h('div', { className: 'rj-header__bar' }, [
        h('a', { className: 'rj-brand', href: '#/recovery', 'aria-label': 'ReboundOps — my next step' }, [
          h('img', { src: '/brand/reboundops-mark.png', alt: '', width: '28', height: '28' }),
          h('span', { className: 'rj-brand__word' }, ['Rebound', h('span', { text: 'Ops' })]),
        ]),
        h('div', { className: 'rj-header__tools' }, [
          h('button', { type: 'button', className: 'rj-chip', onclick: () => document.getElementById('theme-toggle')?.click() }, [icon('theme', 16), 'Theme']),
          h('a', { className: 'rj-chip', href: '#/dashboard' }, [icon('tools', 16), 'Job-search tools']),
        ]),
      ]),
      eyebrow ? h('p', { className: 'rj-eyebrow', text: eyebrow }) : null,
      h('h1', { className: 'rj-title page-title', text: title }),
      lede ? h('p', { className: 'rj-lede', text: lede }) : null,
    ]);
  }

  // ───────────────────────── chrome and navigation ─────────────────────────
  function routeName() { try { return Router.current().name; } catch { return ''; } }

  function applyMode() {
    const name = routeName();
    const journey = JOURNEY_ROUTES.includes(name);
    document.body.classList.toggle('rb-journey', journey);
    for (const a of document.querySelectorAll('.rj-bottom-nav a[data-route]')) {
      if (a.dataset.route === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    // A tool route opens the Tools section so its active item stays visible.
    if (!journey && name && name !== 'tracker') setToolsOpen(true, false);
    paintPanel();
  }

  const TOOLS_KEY = 'reboundops:tools-open';
  function setToolsOpen(open, persist) {
    const nav = document.querySelector('.sidebar .nav');
    const btn = document.getElementById('rj-tools-toggle');
    if (!nav || !btn) return;
    nav.classList.toggle('rj-tools-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (persist) { try { window.localStorage.setItem(TOOLS_KEY, open ? '1' : '0'); } catch { /* ignore */ } }
  }
  function initNav() {
    const btn = document.getElementById('rj-tools-toggle');
    if (btn) {
      let open = false;
      try { open = window.localStorage.getItem(TOOLS_KEY) === '1'; } catch { /* ignore */ }
      setToolsOpen(open, false);
      btn.addEventListener('click', () => setToolsOpen(btn.getAttribute('aria-expanded') !== 'true', true));
    }
    document.getElementById('rj-bottom-more')?.addEventListener('click', () => document.getElementById('sidebar-toggle')?.click());
  }

  // Quiet next-step panel on job-search tool screens (session from memory).
  let loading = false;
  async function paintPanel() {
    const panel = document.getElementById('rb-strip');
    if (!panel) return;
    const name = routeName();
    if (!RS.hasSession() || JOURNEY_ROUTES.includes(name)) { panel.hidden = true; return; }
    if (!RS.session()) {
      if (loading) return;
      loading = true; await RS.load(); loading = false;
    }
    const s = RS.summary();
    if (!s || !s.routeId) { panel.hidden = true; return; }
    const next = s.next ? `${s.next.title} · about ${duration(s.next.minutes)}` : 'This week’s steps are done';
    panel.replaceChildren(
      h('span', { className: 'rj-panel__label' }, [icon('next', 16), 'My next step']),
      h('span', { className: 'rj-panel__text', text: next }),
      h('span', { className: 'rj-panel__dir', text: `${s.routeTitle}${s.target ? ' — ' + s.target : ''}` }),
      h('a', { href: '#/recovery', className: 'rj-panel__link', text: 'Back to my plan' }),
    );
    panel.hidden = false;
  }

  function init() {
    initNav();
    window.addEventListener('hashchange', applyMode);
    RS.subscribe(paintPanel);
    applyMode();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 0);

  function toolContext(kind) {
    const summary = RS.summary();
    return h('section', { className: 'rw-tool-context', 'aria-label': 'ReboundOps decision context' }, [
      h('div', {}, [h('h2', { text: kind === 'scan' ? 'Opportunity lens' : 'Application review' }), h('p', { text: kind === 'scan' ? 'Look for a requirement you can demonstrate and a question worth testing. A job score does not predict a hiring decision.' : 'Choose what needs a conversation, preparation or a follow-up. Statuses below are your records, not predictions.' }), h('a', { href: '#/dashboard', className: 'rj-btn', text: 'Return to my search workbench' })]),
      h('aside', {}, [h('strong', { text: summary && summary.target ? `Testing: ${summary.target}` : 'Your recovery direction stays yours.' }), h('p', { text: 'Review confirmed achievements in your recovery plan. These tools keep separate records; no evidence is silently synchronized.' })])
    ]);
  }

  return { h, icon, duration, URGENCY, errorText, confirm, status, header, applyMode, JOURNEY_ROUTES, toolContext };
})();
