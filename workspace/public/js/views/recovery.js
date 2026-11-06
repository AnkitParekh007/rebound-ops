/* global Router, ReboundState */
/**
 * ReboundOps Next — goal-first recovery views.
 *
 *   #/start     Screen A: "What are you trying to achieve?" + minimal intake
 *   #/recovery  Screen B: real Return / Shift / Bridge routes and the real
 *               seven-day plan from the ReboundOps API (via /api/rebound/*)
 *
 * Every value shown here comes from the ReboundOps API response; nothing is
 * generated client-side. All text is rendered with textContent (no innerHTML
 * with user or API data).
 */
(function () {
  const RS = window.ReboundState;

  function h(tag, props, children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'className') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children || [])) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const b = window.crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const x = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
  }

  function errorText(r) {
    const d = r && r.data;
    if (!r || r.status === 0 || (d && (d.error === 'RECOVERY_SERVICE_OFFLINE' || d.error === 'RECOVERY_SERVICE_TIMEOUT'))) {
      return 'Recovery service is offline. Start it with scripts/start-demo.sh (or `npm run start -w @reboundops/api`) from the rebound-ops folder, then retry. The job-search workspace still works on its own.';
    }
    if (d && d.error === 'STALE_REVISION') return 'This plan changed elsewhere. It was refreshed with the latest saved state — please retry.';
    if (d && d.error === 'SESSION_NOT_FOUND') return 'This recovery session is no longer on the local API (sessions are memory-only and end when the API restarts). Start again from your goal.';
    if (d && Array.isArray(d.issues)) return 'Please check: ' + d.issues.map((i) => `${i.path || 'field'} — ${i.message}`).join('; ');
    if (d && d.message) return String(d.message);
    return `Request failed (${r.status}${d && d.error ? ' ' + d.error : ''}).`;
  }

  function offlineBanner() {
    const box = h('div', { className: 'rb-alert', role: 'status', hidden: true });
    RS.call('GET', '/health').then((r) => {
      if (!r.ok) { box.textContent = errorText(r); box.hidden = false; }
    });
    return box;
  }

  const DEMO = {
    goal: 'similar',
    role: 'Software Engineer',
    weeklyHours: 4,
    urgency: 'soon',
    priorities: 'Find a similar role. Keep remote options open; protect weekday evenings.',
    location: 'Remote (fictional)',
    shiftTarget: 'Developer Experience Engineer',
    bridgeTarget: 'Contract CI/CD pipeline review',
    achievements: 'Cut a test suite runtime from 30 to 12 minutes for a fictional team (Example Corp, demo data)',
  };

  // ───────────────────────── Screen A — goal ─────────────────────────
  Router.register('start', async () => {
    RS.markVisited();
    const prefill = RS.get().draft || {};

    const goalSet = h('fieldset', { className: 'rb-goals' }, [
      h('legend', { className: 'visually-hidden', text: 'Your goal' }),
      ...Object.entries(RS.GOALS).map(([key, g]) => h('label', { className: 'rb-goal' }, [
        h('input', { type: 'radio', name: 'rb-goal', value: key, checked: (prefill.goal || 'direction') === key }),
        h('span', { text: g.label }),
      ])),
    ]);

    const field = (label, input, hint, full) => h('label', { className: full ? 'rb-full' : null }, [
      label, input, hint ? h('span', { className: 'rb-hint', text: hint }) : null,
    ]);
    const role = h('input', { name: 'role', required: true, maxLength: 120, autocomplete: 'off', value: prefill.role || '' });
    const hours = h('input', { name: 'weeklyHours', type: 'number', min: '1', max: '20', step: '1', required: true, value: String(prefill.weeklyHours || 4) });
    const urgency = h('select', { name: 'urgency' }, [
      h('option', { value: 'soon', text: 'Soon — within weeks' }),
      h('option', { value: 'quarter', text: 'This quarter' }),
      h('option', { value: 'flexible', text: 'Flexible' }),
    ]);
    urgency.value = prefill.urgency || 'soon';
    const priorities = h('textarea', { name: 'priorities', rows: 2, maxLength: 1000 });
    priorities.value = prefill.priorities || '';
    const location = h('input', { name: 'location', maxLength: 160, value: prefill.location || '' });
    const shift = h('input', { name: 'shiftTarget', maxLength: 140, value: prefill.shiftTarget || '' });
    const bridge = h('input', { name: 'bridgeTarget', maxLength: 140, value: prefill.bridgeTarget || '' });
    const achievements = h('textarea', { name: 'achievements', rows: 3 });
    achievements.value = prefill.achievements || '';

    const alertBox = h('div', { className: 'rb-alert', role: 'alert', hidden: true });
    const submit = h('button', { className: 'btn btn-primary', type: 'submit', text: 'Create my recovery session' });

    function fill(values) {
      role.value = values.role; hours.value = String(values.weeklyHours); urgency.value = values.urgency;
      priorities.value = values.priorities; location.value = values.location; shift.value = values.shiftTarget;
      bridge.value = values.bridgeTarget; achievements.value = values.achievements;
      const radio = goalSet.querySelector(`input[value="${values.goal}"]`);
      if (radio) radio.checked = true;
    }

    goalSet.addEventListener('change', () => {
      const goal = goalSet.querySelector('input:checked')?.value;
      if (goal === 'known') { RS.markVisited(); Router.go('/dashboard'); }
    });

    const form = h('form', { className: 'rb-card', novalidate: true }, [
      h('h2', { text: 'What are you trying to achieve?' }),
      h('p', { className: 'rb-hint', text: 'Pick the closest goal. It suggests a direction; you still choose.' }),
      goalSet,
      h('h2', { text: 'A few facts to build your plan', style: 'margin-top:20px' }),
      h('div', { className: 'rb-fields' }, [
        field('Current or last role *', role),
        field('Hours available per week *', hours, '1–20. The plan never exceeds this budget.'),
        field('Urgency', urgency),
        field('Location (optional)', location),
        field('What matters most right now (optional)', priorities, 'Short priorities or constraints. Your goal is added automatically.', true),
        field('Possible new direction (optional)', shift, 'Used for the “new kind of work” option.'),
        field('Possible stepping-stone (optional)', bridge, 'Used for the “stepping-stone role” option.'),
        field('Achievements you can describe (optional, one per line, max 15)', achievements,
          'Self-reported and saved as UNVERIFIED. Use fictional examples for this demo — no employer secrets or real résumé text.', true),
      ]),
      alertBox,
      h('div', { className: 'rb-actions' }, [
        submit,
        h('button', { className: 'btn btn-ghost', type: 'button', text: 'Use fictional demo', onclick: () => fill(DEMO) }),
        h('a', { href: '#/dashboard', text: 'Skip to job-search workspace', onclick: () => RS.markVisited() }),
      ]),
    ]);

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      alertBox.hidden = true;
      const goal = goalSet.querySelector('input:checked')?.value || 'direction';
      const weeklyHours = Number(hours.value);
      const lines = achievements.value.split('\n').map((s) => s.trim()).filter(Boolean);
      const problems = [];
      if (!role.value.trim()) problems.push('Enter your current or last role.');
      if (!Number.isInteger(weeklyHours) || weeklyHours < 1 || weeklyHours > 20) problems.push('Hours per week must be a whole number from 1 to 20.');
      if (lines.length > 15) problems.push('Enter at most 15 achievements.');
      if (lines.some((l) => l.length > 500)) problems.push('Each achievement must be under 500 characters.');
      if (problems.length) { alertBox.textContent = problems.join(' '); alertBox.hidden = false; return; }

      const goalLabel = RS.GOALS[goal].label;
      const intake = {
        role: role.value.trim(),
        location: location.value.trim(),
        weeklyHours,
        urgency: urgency.value,
        priorities: [`Goal: ${goalLabel}.`, priorities.value.trim()].filter(Boolean).join(' ').slice(0, 1200),
        shiftTarget: shift.value.trim(),
        bridgeTarget: bridge.value.trim(),
        evidence: lines.map((claim) => ({ id: uuid(), claim, source: { kind: 'manual', label: 'Self-reported in ReboundOps Next' }, status: 'unverified' })),
      };
      submit.disabled = true; submit.textContent = 'Creating session…';
      const r = await RS.call('POST', '/sessions', { intake });
      submit.disabled = false; submit.textContent = 'Create my recovery session';
      if (!r.ok) { alertBox.textContent = errorText(r); alertBox.hidden = false; return; }
      RS.set({
        goal, goalLabel, suggestedRoute: RS.GOALS[goal].route,
        draft: { goal, role: intake.role, weeklyHours, urgency: intake.urgency, priorities: priorities.value, location: intake.location, shiftTarget: intake.shiftTarget, bridgeTarget: intake.bridgeTarget, achievements: achievements.value },
      });
      RS.fromSession(r.data);
      Router.go('/recovery');
    });

    return h('div', { className: 'rb-page' }, [
      h('header', { className: 'rb-hero' }, [
        h('img', { className: 'rb-logo rb-logo--light', src: '/brand/reboundops-logo-on-light.png', alt: 'ReboundOps', width: '560', height: '391' }),
        h('img', { className: 'rb-logo rb-logo--dark', src: '/brand/reboundops-logo-on-dark.png', alt: 'ReboundOps', width: '560', height: '391' }),
        h('p', { className: 'rb-eyebrow', text: 'ReboundOps · career recovery' }),
        h('h1', { className: 'page-title', text: 'Your next career move starts with clarity.' }),
        h('p', { className: 'rb-lede', text: 'Recover your direction, plan the next seven days, then move into the job-search workspace.' }),
        h('p', { className: 'rb-note', text: 'This is a self-guided hypothesis, not validated career advice. AI is off — no API key is needed. Your answers go only to the ReboundOps API on this computer (memory-only) and are not written to ReboundOps files.' }),
      ]),
      offlineBanner(),
      form,
    ]);
  });

  // ─────────────────────── Screen B — direction + plan ───────────────────────
  Router.register('recovery', async () => {
    const st = RS.get();
    const root = h('div', { className: 'rb-page' });
    const header = h('header', { className: 'rb-hero' }, [
      h('p', { className: 'rb-eyebrow', text: 'ReboundOps · career recovery' }),
      h('h1', { className: 'page-title', text: 'First get clarity. Then take action.' }),
      h('p', { className: 'rb-lede', text: 'Three possible directions, built from what you told ReboundOps. They are options to test, not predictions or fit scores.' }),
    ]);
    root.append(header);

    if (!st.sessionId) {
      root.append(h('div', { className: 'rb-card' }, [
        h('h2', { text: 'No recovery session yet' }),
        h('p', { text: 'Start with your goal to get three directions and a seven-day plan.' }),
        h('div', { className: 'rb-actions' }, [
          h('a', { className: 'btn btn-primary', href: '#/start', text: 'Start with your goal' }),
          h('a', { href: '#/dashboard', text: 'Skip to job-search workspace' }),
        ]),
      ]));
      return root;
    }

    const alertBox = h('div', { className: 'rb-alert', role: 'alert', hidden: true });
    const routesCard = h('section', { className: 'rb-card', id: 'rb-routes', 'aria-labelledby': 'rb-routes-h' });
    const planCard = h('section', { className: 'rb-card', 'aria-labelledby': 'rb-plan-h' });
    root.append(alertBox, routesCard, planCard);

    let session = null;
    function showError(r) { alertBox.textContent = errorText(r); alertBox.hidden = false; }

    async function refresh() {
      const r = await RS.call('GET', `/sessions/${st.sessionId}`);
      if (!r.ok) { showError(r); return false; }
      session = r.data; RS.fromSession(session); paint(); return true;
    }

    async function mutate(path, body) {
      alertBox.hidden = true;
      const r = await RS.call('PUT', path, body);
      if (r.ok) { session = r.data; RS.fromSession(session); paint(); return; }
      showError(r);
      if (r.status === 409 && r.data && r.data.session) { session = r.data.session; RS.fromSession(session); paint(); }
      else if (r.status >= 400 && r.status < 500) { await refresh(); alertBox.hidden = false; }
    }

    function paint() {
      const suggested = RS.get().suggestedRoute;
      const selected = session.plan ? session.plan.routeId : null;
      const evidenceCount = session.intake.evidence.length;
      routesCard.replaceChildren(
        h('h2', { id: 'rb-routes-h', text: 'Choose a direction' }),
        h('p', { className: 'rb-hint', text: `For: ${session.intake.role} · ${session.intake.weeklyHours} h/week · urgency “${session.intake.urgency}”. ${evidenceCount} self-reported achievement${evidenceCount === 1 ? '' : 's'} (unverified).` }),
        h('div', { className: 'rb-routes' }, session.routes.map((route) => h('article', {
          className: 'rb-route' + (route.id === selected ? ' is-selected' : ''), 'data-route-id': route.id,
        }, [
          route.id === selected ? h('span', { className: 'rb-badge', text: 'Selected' })
            : route.id === suggested ? h('span', { className: 'rb-badge', text: 'Suggested by your goal' }) : null,
          h('h3', { text: RS.ROUTE_TITLES[route.id] || route.label }),
          h('p', {}, [h('b', { text: 'Target: ' }), route.target]),
          h('p', {}, [h('b', { text: 'Missing proof: ' }), route.missingProof.join(' ')]),
          h('p', {}, [h('b', { text: 'Uncertainty: ' }), route.uncertainty]),
          h('p', {}, [h('b', { text: 'Suggested test: ' }), route.nextTest]),
          h('p', { text: `Internal name: ${route.label}` }),
          h('button', {
            className: route.id === selected ? 'btn btn-ghost' : 'btn btn-primary', type: 'button',
            disabled: route.id === selected,
            text: route.id === selected ? 'Current direction' : (selected ? 'Switch to this direction' : 'Choose this direction'),
            onclick: () => mutate(`/sessions/${session.id}/route`, { expectedRevision: session.revision, routeId: route.id }),
          }),
        ]))),
      );

      if (!session.plan) {
        planCard.replaceChildren(
          h('h2', { id: 'rb-plan-h', text: 'Your seven-day plan' }),
          h('p', { className: 'rb-hint', text: 'Choose a direction above to generate a plan within your weekly hours.' }),
          h('div', { className: 'rb-actions' }, [h('a', { href: '#/start', text: 'Edit goal' })]),
        );
        return;
      }
      const plan = session.plan;
      const route = session.routes.find((r) => r.id === plan.routeId);
      const done = plan.actions.filter((a) => a.completed).length;
      planCard.replaceChildren(
        h('h2', { id: 'rb-plan-h', text: `Your seven-day plan — ${RS.ROUTE_TITLES[plan.routeId]}` }),
        h('div', { className: 'rb-meta' }, [
          h('span', { className: 'rb-pill', text: `Planned ${plan.plannedMinutes} of ${plan.budgetMinutes} min budget` }),
          h('span', { className: 'rb-pill', text: `${done} of ${plan.actions.length} done` }),
          h('span', { className: 'rb-pill', text: `Session revision ${session.revision}` }),
        ]),
        h('ul', { className: 'rb-plan' }, plan.actions.map((a) => h('li', {}, [
          h('label', { className: 'rb-task' }, [
            h('input', {
              type: 'checkbox', checked: a.completed, 'data-action-id': a.id,
              onchange: (ev) => mutate(`/sessions/${session.id}/actions/${a.id}`, { expectedRevision: session.revision, completed: ev.target.checked }),
            }),
            h('span', {}, [h('small', { text: `Day ${a.day} · ${a.minutes} min` }), h('strong', { text: a.title })]),
          ]),
        ]))),
        h('p', { className: 'rb-note' }, [h('b', { text: 'Unknowns: ' }), `${route.uncertainty} ${route.missingProof.join(' ')}`]),
        h('p', { className: 'rb-hint', text: 'Checkbox changes are saved to the ReboundOps session on this computer. Achievements are user-reported and unverified; AI is not used.' }),
        h('div', { className: 'rb-actions' }, [
          h('a', { className: 'btn btn-primary', href: '#/dashboard', 'data-testid': 'rb-continue', text: 'Continue to job-search workspace' }),
          h('button', { className: 'btn btn-ghost', type: 'button', text: 'Switch route', onclick: () => document.getElementById('rb-routes')?.scrollIntoView({ behavior: 'smooth' }) }),
          h('button', { className: 'btn btn-ghost', type: 'button', text: 'Export plan (.md)', onclick: exportPlan }),
          h('a', { href: '#/start', text: 'Edit goal' }),
        ]),
      );
    }

    async function exportPlan() {
      const r = await RS.call('GET', `/sessions/${session.id}/export`);
      if (!r.ok) { showError(r); return; }
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/markdown' }));
      const a = h('a', { href: url, download: 'reboundops-seven-day-plan.md' });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    if (!(await refresh())) {
      routesCard.replaceChildren(h('div', { className: 'rb-actions' }, [
        h('a', { className: 'btn btn-primary', href: '#/start', text: 'Start again from your goal' }),
        h('button', { className: 'btn btn-ghost', type: 'button', text: 'Retry', onclick: () => Router.render() }),
        h('a', { href: '#/dashboard', text: 'Open job-search workspace' }),
      ]));
      planCard.remove();
    }
    return root;
  });

  // ─────────────── context strip on the ReboundOps views ───────────────
  function paintStrip() {
    const strip = document.getElementById('rb-strip');
    if (!strip) return;
    const st = RS.get();
    const name = Router.current().name;
    if (!st.routeId || name === 'start' || name === 'recovery') { strip.hidden = true; return; }
    const next = st.nextAction
      ? `Day ${st.nextAction.day}: ${st.nextAction.title} (${st.nextAction.minutes} min)`
      : (st.planDone ? 'All plan actions done — review what you learned' : '—');
    strip.replaceChildren(
      h('span', { className: 'rb-strip__brand', text: 'ReboundOps' }),
      st.goalLabel ? h('span', { className: 'rb-strip__item' }, [h('b', { text: 'Goal: ' }), st.goalLabel]) : null,
      h('span', { className: 'rb-strip__item' }, [h('b', { text: 'Direction: ' }), `${st.routeTitle}${st.target ? ' — ' + st.target : ''}`]),
      h('span', { className: 'rb-strip__item' }, [h('b', { text: 'Next: ' }), next]),
      h('a', { href: '#/recovery', text: 'Back to recovery plan' }),
    );
    strip.hidden = false;
  }
  window.addEventListener('hashchange', paintStrip);
  RS.subscribe(paintStrip);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintStrip);
  else setTimeout(paintStrip, 0);
})();
