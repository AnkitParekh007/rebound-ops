/* global Router, ReboundState, Journey */
/**
 * ReboundOps — recovery journey views on the real ReboundOps API:
 *
 *   #/recovery       My next step (Recovery Home): snapshot + the one decision
 *                    or the one next action, full week behind a disclosure
 *   #/directions     Direction Canvas: three hypotheses, expandable unknowns
 *   #/opportunities  Consent handoff to the job-search tools (read-only filter)
 *   #/evidence       Evidence Ledger: the person's own review of achievements
 *
 * Everything shown comes from the session the API returns; nothing is
 * generated client-side. Text is rendered with textContent only.
 */
(function () {
  const RS = window.ReboundState;
  const { h, icon, duration, URGENCY, errorText, confirm, status, header } = window.Journey;
  const ROUTE_ICON = { return: 'return', shift: 'shift', bridge: 'bridge' };

  function cleanPriorities(p) { return String(p || '').replace(/^Goal: [^.]*\.\s*/, '').trim(); }
  function targetOf(route) { return RS.PLACEHOLDER_TARGETS.includes(route.target) ? '' : route.target; }
  function evidenceLine(ev) {
    if (!ev.length) return 'No achievements added yet';
    const unrev = ev.filter((e) => e.status === 'unverified').length;
    const rev = ev.filter((e) => e.status === 'confirmed').length;
    const parts = [];
    if (rev) parts.push(`${rev} reviewed by you`);
    if (unrev) parts.push(`${unrev} not yet reviewed`);
    return `${ev.length} self-reported achievement${ev.length === 1 ? '' : 's'} · ${parts.join(' · ') || 'set aside'}`;
  }

  /** Shared loader: returns the session or renders a helpful state. */
  async function withSession(root, title) {
    if (!RS.hasSession()) {
      root.append(await RS.dataControls());
      root.append(header('ReboundOps', title || 'Let’s start with one question', 'Answer a few short questions and ReboundOps will lay out three directions to test and a week that fits your time.'),
        h('div', { className: 'rj-empty' }, [
          h('div', { className: 'rj-empty__art', 'aria-hidden': 'true' }, [icon('bridge', 64)]),
          h('div', { className: 'rj-actions' }, [
            h('a', { className: 'rj-btn rj-btn--primary', href: '#/start', text: 'Start — about two minutes' }),
            h('a', { className: 'rj-btn rj-btn--quiet', href: '#/dashboard', text: 'Go to job-search tools' }),
          ]),
        ]));
      return null;
    }
    const r = await RS.load();
    if (r.ok) return r.data;
    if (r.status === 404) {
      root.append(await RS.dataControls());
      root.append(header('ReboundOps', 'Your earlier plan has ended', 'This session is no longer available in memory. Resume a saved session or restore a JSON backup below. Sessions without local saving or a backup cannot be recovered after restart.'),
        h('div', { className: 'rj-actions' }, [h('a', { className: 'rj-btn rj-btn--primary', href: '#/start', text: 'Start again' }), h('a', { className: 'rj-btn rj-btn--quiet', href: '#/dashboard', text: 'Go to job-search tools' })]));
      return null;
    }
    root.append(header('ReboundOps', 'The recovery service is not reachable', null),
      h('p', { className: 'rj-alert', role: 'alert', text: errorText(r) }),
      h('div', { className: 'rj-actions' }, [h('button', { type: 'button', className: 'rj-btn rj-btn--primary', text: 'Try again', onclick: () => Router.render() }), h('a', { className: 'rj-btn rj-btn--quiet', href: '#/dashboard', text: 'Go to job-search tools' })]));
    return null;
  }

  function snapshot(s) {
    const plan = s.plan;
    const route = plan ? s.routes.find((r) => r.id === plan.routeId) : null;
    const goal = RS.GOALS[RS.get().goal];
    const heading = route ? `${RS.ROUTE_TITLES[route.id]}${targetOf(route) ? ' — ' + targetOf(route) : ''}` : (goal ? goal.label : 'Not chosen yet');
    const item = (label, value) => h('div', { className: 'rj-snap__item' }, [h('dt', { text: label }), h('dd', { text: value })]);
    return h('aside', { className: 'rj-snap', 'aria-labelledby': 'rj-snap-h' }, [
      h('h2', { id: 'rj-snap-h', className: 'rj-snap__title', text: 'Where you are' }),
      h('dl', {}, [
        item('Starting from', s.intake.role),
        item('Heading toward', heading),
        item('What matters', cleanPriorities(s.intake.priorities) || 'Not added'),
        item('This week', `${s.intake.weeklyHours} ${s.intake.weeklyHours === 1 ? 'hour' : 'hours'} · ${URGENCY[s.intake.urgency] || ''}`),
        h('div', { className: 'rj-snap__item' }, [h('dt', { text: 'Evidence' }), h('dd', {}, [h('a', { href: '#/evidence', text: evidenceLine(s.intake.evidence) })])]),
      ]),
      h('a', { className: 'rj-btn rj-btn--link', href: '#/start/edit', text: 'Edit my answers' }),
    ]);
  }

  function stones(done, total) {
    return h('ol', { className: 'rj-stones', 'aria-label': `${done} of ${total} steps done` }, Array.from({ length: total }, (_, i) => h('li', { className: i < done ? 'is-done' : '' })));
  }

  // ─────────────────────────────── My next step ───────────────────────────────
  Router.register('recovery', async () => {
    const root = h('div', { className: 'rj rj-home' });
    const s = await withSession(root);
    if (!s) return root;
    const say = status();
    const plan = s.plan;

    async function mark(action, completed) {
      const cur = RS.session();
      const r = await RS.call('PUT', `/sessions/${cur.id}/actions/${action.id}`, { expectedRevision: cur.revision, completed });
      if (r.ok) { RS.setSession(r.data); await Router.render(); const live = document.querySelector('.rj-home .rj-status'); if (live) live.textContent = completed ? `Marked “${action.title}” as done.` : `“${action.title}” is no longer marked as done.`; return; }
      if (r.status === 409 && r.data && r.data.session) RS.setSession(r.data.session);
      say.textContent = errorText(r);
    }

    let main;
    if (!plan) {
      main = h('section', { className: 'rj-decision', 'aria-labelledby': 'rj-dec-h' }, [
        h('p', { className: 'rj-kicker', text: 'Your next decision' }),
        h('h2', { id: 'rj-dec-h', className: 'rj-decision__title', text: 'Pick one direction to test this week' }),
        h('p', { className: 'rj-measure', text: 'ReboundOps built three hypotheses from your answers. None is a prediction — each comes with what is unknown and a first small experiment. You can change your mind later.' }),
        h('ul', { className: 'rj-mini' }, s.routes.map((r) => h('li', {}, [icon(ROUTE_ICON[r.id], 20), h('span', {}, [h('strong', { text: RS.ROUTE_TITLES[r.id] }), ' — ' + (targetOf(r) || 'target not set yet')])]))),
        h('div', { className: 'rj-actions' }, [h('a', { className: 'rj-btn rj-btn--primary', href: '#/directions' }, ['Compare the three directions', icon('arrow', 18)])]),
      ]);
    } else {
      const route = s.routes.find((r) => r.id === plan.routeId);
      const next = plan.actions.find((a) => !a.completed);
      const done = plan.actions.filter((a) => a.completed).length;
      const week = h('details', { className: 'rj-week' }, [
        h('summary', { text: `See the whole week (${plan.actions.length} steps)` }),
        h('ol', { className: 'rj-week__list' }, plan.actions.map((a) => h('li', { className: a.completed ? 'is-done' : '' }, [
          h('label', { className: 'rj-week__item' }, [
            h('input', { type: 'checkbox', checked: a.completed, 'data-action-id': a.id, onchange: (e) => mark(a, e.target.checked) }),
            h('span', {}, [h('span', { className: 'rj-week__meta', text: `Day ${a.day} · about ${duration(a.minutes)}` }), h('span', { className: 'rj-week__title', text: a.title })]),
          ]),
        ]))),
      ]);
      const budget = h('p', { className: 'rj-budget', text: plan.budgetMinutes === s.intake.weeklyHours * 60
        ? `About ${duration(plan.plannedMinutes)} planned within your ${duration(plan.budgetMinutes)} a week.`
        : `This saved week has ${duration(plan.plannedMinutes)} of work. Your new ${duration(s.intake.weeklyHours * 60)} limit applies to your next plan.` });
      main = next
        ? h('section', { className: 'rj-next', 'aria-labelledby': 'rj-next-h' }, [
          h('p', { className: 'rj-kicker' }, [icon('next', 18), 'Your next useful step']),
          h('h2', { id: 'rj-next-h', className: 'rj-next__title', text: next.title }),
          h('p', { className: 'rj-next__meta', text: `Day ${next.day} of your week · about ${duration(next.minutes)}` }),
          h('div', { className: 'rj-why' }, [h('p', { className: 'rj-why__label', text: `Why it matters for “${RS.ROUTE_TITLES[route.id]}”` }), h('p', { text: `It helps answer: ${route.missingProof.join(' ')}` })]),
          h('div', { className: 'rj-actions' }, [
            h('button', { type: 'button', className: 'rj-btn rj-btn--primary', 'data-testid': 'rj-mark-done', onclick: () => mark(next, true) }, [icon('check', 18), 'Mark as done']),
            h('a', { className: 'rj-btn rj-btn--quiet', href: '#/opportunities', text: 'Find opportunities for this direction' }),
          ]),
          h('div', { className: 'rj-progress' }, [stones(done, plan.actions.length), h('span', { text: `${done} of ${plan.actions.length} steps done` })]),
          budget, week,
        ])
        : h('section', { className: 'rj-next', 'aria-labelledby': 'rj-next-h' }, [
          h('p', { className: 'rj-kicker' }, [icon('check', 18), 'Week complete']),
          h('h2', { id: 'rj-next-h', className: 'rj-next__title', text: 'You worked through every step of this week’s plan' }),
          h('p', { className: 'rj-measure', text: 'Next, decide whether to continue with this direction, try another, or pause. (A guided weekly reflection is planned but not built yet.)' }),
          h('div', { className: 'rj-actions' }, [
            h('a', { className: 'rj-btn rj-btn--primary', href: '#/opportunities', text: 'Find opportunities for this direction' }),
            h('a', { className: 'rj-btn rj-btn--quiet', href: '#/directions', text: 'Change direction' }),
          ]),
          h('div', { className: 'rj-progress' }, [stones(done, plan.actions.length), h('span', { text: `${done} of ${plan.actions.length} steps done` })]),
          budget, week,
        ]);
    }

    async function exportPlan() {
      const r = await RS.call('GET', `/sessions/${s.id}/export`);
      if (!r.ok) { say.textContent = errorText(r); return; }
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/markdown' }));
      const a = h('a', { href: url, download: 'reboundops-seven-day-plan.md' });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say.textContent = 'Your plan was downloaded as a Markdown file.';
    }

    const experiment = plan ? h('details', {}, [h('summary', { text: 'Make a step specific to your evidence gap' })]) : null;
    if (experiment) {
      const select = h('select', { 'aria-label': 'Step to replace' }, plan.actions.map(action => h('option', { value: action.id, text: `Day ${action.day} · ${action.minutes} minutes · ${action.title}` })));
      select.value = (plan.actions.find(action => !action.completed) || plan.actions[0])?.id || '';
      const text = h('textarea', { 'aria-label': 'Your concrete experiment', maxLength: 500, rows: 3, required: true });
      experiment.append(h('p', { text: 'Replace a task with a concrete experiment. The allocated minutes stay the same; its completion mark resets.' }), select, text);
      for (const target of s.jobTargets || []) for (const requirement of target.requirements.filter(item => item.status === 'gap')) experiment.append(h('button', { type: 'button', className: 'rj-btn', text: 'Use gap: ' + requirement.text, onclick: () => {
        const minutes = plan.actions.find(action => action.id === select.value)?.minutes;
        text.value = `Within ${minutes} minutes, test “${requirement.text.slice(0,150)}”: choose one small, permission-safe example, record the steps and observable result, then list what remains unproven. Stop at the time limit; do not claim production experience.`;
        text.focus();
      } }));
      experiment.append(h('button', { type: 'button', className: 'rj-btn', text: 'Save experiment', onclick: async () => {
        if (text.value.trim().length < 3) { say.textContent = 'Describe a concrete experiment first.'; return; }
        const current = RS.session(); const result = await RS.call('PUT', `/sessions/${current.id}/actions/${select.value}/experiment`, { expectedRevision: current.revision, title: text.value.trim() });
        if (result.ok) { RS.setSession(result.data); Router.render(); } else say.textContent = errorText(result);
      } }));
    }
    const route = plan ? s.routes.find((r) => r.id === plan.routeId) : null;
    root.append(
      header('My next step', plan ? (route ? `Testing: ${RS.ROUTE_TITLES[route.id]}` : 'Your plan') : 'You have three directions to compare', null),
      h('div', { className: 'rj-home__grid' }, [
        h('div', { className: 'rj-home__main' }, [
          main,
          plan ? h('div', { className: 'rj-row-links' }, [
            h('a', { href: '#/directions', text: 'Change direction' }),
            h('button', { type: 'button', className: 'rj-btn rj-btn--link', text: 'Download plan (Markdown)', onclick: exportPlan }),
          ]) : null,
          plan ? h('nav', { 'aria-label': 'Work on your plan', className: 'rj-row-links' }, [
            h('a', { href: '#/evidence', text: '1. Review an achievement' }),
            h('a', { href: '#/cv', text: '2. Draft a résumé bullet' }),
            h('a', { href: '#/tracker', text: '3. Record an application' }),
          ]) : null,
          experiment, say,
        ]),
        snapshot(s),
      ]),
      await RS.dataControls(),
      h('p', {}, [h('a', { href: '#/guide', text: 'What next? Open the workspace guide →' })]),
    );
    return root;
  });

  // ─────────────────────────────── Direction Canvas ───────────────────────────────
  Router.register('directions', async () => {
    const root = h('div', { className: 'rj rj-canvas' });
    const s = await withSession(root, 'Explore directions');
    if (!s) return root;
    const say = status();
    const suggested = RS.get().suggestedRoute;
    const current = s.plan ? s.plan.routeId : null;

    async function choose(route) {
      const cur = RS.session();
      if (cur.plan) {
        const done = cur.plan.actions.filter((a) => a.completed).length;
        const ok = await confirm({
          title: `Switch to “${RS.ROUTE_TITLES[route.id]}”?`,
          body: [
            `Your current plan for “${RS.ROUTE_TITLES[cur.plan.routeId]}” will be replaced by a new week for this direction.`,
            done ? `${done} completed step${done === 1 ? '' : 's'} will not carry over. You can download the current plan first from My next step.` : 'No steps are marked as done yet.',
          ],
          confirmLabel: 'Switch direction', cancelLabel: 'Keep my current plan',
        });
        if (!ok) return;
      }
      const r = await RS.call('PUT', `/sessions/${cur.id}/route`, { expectedRevision: cur.revision, routeId: route.id });
      if (r.ok) { RS.setSession(r.data); Router.go('/recovery'); return; }
      if (r.status === 409 && r.data && r.data.session) { RS.setSession(r.data.session); }
      say.textContent = errorText(r);
    }

    const evCount = s.intake.evidence.filter((e) => e.status !== 'rejected').length;
    const cols = s.routes.map((r) => {
      const isCurrent = r.id === current;
      return h('article', { className: 'rj-dir' + (isCurrent ? ' is-current' : ''), 'data-route-id': r.id, 'aria-labelledby': `rj-dir-${r.id}` }, [
        h('div', { className: 'rj-dir__head' }, [
          h('span', { className: 'rj-dir__icon' }, [icon(ROUTE_ICON[r.id], 28)]),
          h('div', {}, [
            isCurrent ? h('span', { className: 'rj-tag rj-tag--current', text: 'In your plan' }) : (r.id === suggested ? h('span', { className: 'rj-tag', text: 'Matches your goal' }) : null),
            h('h2', { id: `rj-dir-${r.id}`, className: 'rj-dir__title', text: RS.ROUTE_TITLES[r.id] }),
          ]),
        ]),
        h('p', { className: 'rj-dir__target' }, [h('span', { text: 'Aiming at: ' }), targetOf(r) ? h('strong', { text: targetOf(r) }) : h('em', { text: 'not set — add one in your answers' })]),
        h('div', { className: 'rj-dir__block' }, [h('p', { className: 'rj-dir__label', text: 'First small experiment' }), h('p', { text: r.nextTest })]),
        h('details', { className: 'rj-dir__more' }, [
          h('summary', { text: 'What is still unknown' }),
          h('p', { text: r.uncertainty }),
          h('p', {}, [h('strong', { text: 'Missing proof: ' }), r.missingProof.join(' ')]),
          h('p', {}, [h('strong', { text: 'Evidence to review: ' }), evCount ? `${evCount} self-reported achievement${evCount === 1 ? '' : 's'} (not external verification)` : 'none added yet']),
        ]),
        h('button', {
          // One primary action per view: only the direction matching the goal (or,
          // with no goal match, none) gets the filled button.
          type: 'button', className: 'rj-btn ' + (isCurrent ? 'rj-btn--quiet' : (r.id === (current ? null : suggested) ? 'rj-btn--primary' : '')), disabled: isCurrent,
          text: isCurrent ? 'This is your current plan' : (current ? 'Switch to this direction' : 'Plan my week around this'),
          onclick: () => choose(r),
        }),
      ]);
    });
    root.append(
      header('Explore directions', 'Three directions to test — not predictions', 'Each is a hypothesis built from your answers. Open “What is still unknown” before you choose; you can switch later.'),
      h('div', { className: 'rj-dirs' }, cols),
      say,
    );
    return root;
  });

  // ─────────────────────────────── Consent handoff ───────────────────────────────
  Router.register('opportunities', async () => {
    const root = h('div', { className: 'rj rj-handoff' });
    const s = await withSession(root, 'Find opportunities');
    if (!s) return root;
    if (!s.plan) {
      root.append(header('Find opportunities', 'Choose a direction first', 'Opportunities are easier to judge once you know which direction you are testing.'),
        h('div', { className: 'rj-actions' }, [h('a', { className: 'rj-btn rj-btn--primary', href: '#/directions', text: 'Compare directions' }), h('a', { className: 'rj-btn rj-btn--quiet', href: '#/scan', text: 'Open vacancy search anyway' })]));
      return root;
    }
    const route = s.routes.find((r) => r.id === s.plan.routeId);
    const target = targetOf(route);
    const q = h('input', { className: 'rj-input', id: 'rj-q', maxLength: 140, value: target });
    const go = () => { const v = q.value.trim(); Router.go(v ? `/scan?q=${encodeURIComponent(v)}` : '/scan'); };
    root.append(
      header('Find opportunities', `Look for “${RS.ROUTE_TITLES[route.id]}” opportunities`, 'This opens the job-search workspace with one search filter. Review exactly what will be used first.'),
      h('section', { className: 'rj-consent', 'aria-labelledby': 'rj-use-h' }, [
        h('h2', { id: 'rj-use-h', className: 'rj-consent__title', text: 'What will be used' }),
        h('div', { className: 'rj-field' }, [
          h('label', { for: 'rj-q', className: 'rj-field__label', text: 'Search text for Vacancy search' }),
          h('p', { className: 'rj-field__hint', text: target ? 'Taken from your chosen direction. You can change it.' : 'Your direction has no target role yet. Type a job title to filter by, or leave it empty.' }),
          q,
        ]),
        h('h2', { className: 'rj-consent__title', text: 'What will not happen' }),
        h('ul', { className: 'rj-list' }, [
          h('li', { text: 'Your recovery answers (role, priorities, achievements) are not copied into the job-search files.' }),
          h('li', { text: 'No job board is contacted until you press Scan in Vacancy search.' }),
          h('li', { text: 'No AI is used. Fit scores in the job-search tools are estimates, never hiring predictions.' }),
        ]),
        h('p', { className: 'rj-field__hint', text: 'The filter applies to postings already in Vacancy search. If it is empty, run a scan there first.' }),
        h('div', { className: 'rj-actions' }, [
          h('button', { type: 'button', className: 'rj-btn rj-btn--primary', 'data-testid': 'rj-handoff-continue', onclick: go }, ['Continue to Vacancy search', icon('arrow', 18)]),
          h('a', { className: 'rj-btn rj-btn--quiet', href: '#/recovery', text: 'Not now' }),
          h('a', { className: 'rj-btn rj-btn--link', href: '#/directions', text: 'Review my direction' }),
        ]),
      ]),
      h('p', { className: 'rj-aside' }, ['Other job-search tools: ', h('a', { href: '#/tracker', text: 'Applications' }), ' · ', h('a', { href: '#/evaluate', text: 'Evaluate a posting' }), ' · ', h('a', { href: '#/pipeline', text: 'Saved links' })]),
    );
    return root;
  });

  // ─────────────────────────────── Evidence Ledger ───────────────────────────────
  const EV_STATUS = {
    unverified: { label: 'Self-reported · not reviewed', cls: '' },
    confirmed: { label: 'Reviewed by you', cls: ' is-reviewed' },
    rejected: { label: 'Set aside by you', cls: ' is-aside' },
  };
  Router.register('evidence', async () => {
    const root = h('div', { className: 'rj rj-evidence' });
    const s = await withSession(root, 'My evidence');
    if (!s) return root;
    const say = status();
    async function decide(ev, st) {
      const cur = RS.session();
      const r = await RS.call('PUT', `/sessions/${cur.id}/evidence/${ev.id}`, { expectedRevision: cur.revision, status: st });
      if (r.ok) { RS.setSession(r.data); await Router.render(); return; }
      if (r.status === 409 && r.data && r.data.session) RS.setSession(r.data.session);
      say.textContent = errorText(r);
    }
    const items = s.intake.evidence;
    root.append(
      header('My evidence', 'What you can point to', 'Achievements you described. Reviewing them yourself helps you decide what to rely on — it is not external verification.'),
      items.length
        ? h('ul', { className: 'rj-ledger' }, items.map((ev) => {
          const st = EV_STATUS[ev.status];
          return h('li', { className: 'rj-ledger__item' + st.cls }, [
            h('blockquote', { className: 'rj-ledger__quote', text: ev.claim }),
            h('p', { className: 'rj-ledger__meta' }, [h('span', { className: 'rj-tag', text: st.label }), ` Source: ${ev.source.label}`]),
            h('div', { className: 'rj-actions' }, ev.status === 'unverified' ? [
              h('button', { type: 'button', className: 'rj-btn', text: 'I have reviewed this', onclick: () => decide(ev, 'confirmed') }),
              h('button', { type: 'button', className: 'rj-btn rj-btn--quiet', text: 'Set aside', onclick: () => decide(ev, 'rejected') }),
            ] : [h('button', { type: 'button', className: 'rj-btn rj-btn--quiet', text: 'Undo', onclick: () => decide(ev, 'unverified') })]),
          ]);
        }))
        : h('div', { className: 'rj-empty' }, [h('div', { className: 'rj-empty__art', 'aria-hidden': 'true' }, [icon('evidence', 56)]), h('p', { text: 'No achievements yet. You can add some by editing your answers — note that this rebuilds your plan.' }), h('a', { className: 'rj-btn rj-btn--primary', href: '#/start/edit', text: 'Edit my answers' })]),
      h('p', { className: 'rj-aside', text: 'Adding source quotations and corrections is available in the full ReboundOps app; it is not part of this workspace yet.' }),
      say,
    );
    return root;
  });
})();
