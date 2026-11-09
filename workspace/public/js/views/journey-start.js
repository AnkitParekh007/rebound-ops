/* global Router, ReboundState, Journey */
/**
 * ReboundOps — goal-first start (#/start) and "Edit my answers" (#/start/edit).
 *
 * Four short steps with an optional, browser-local first-intake draft.
 */
(function () {
  const RS = window.ReboundState;
  const { h, icon, URGENCY, errorText, confirm, status, header } = window.Journey;
  const GOAL_ICON = { similar: 'return', new: 'shift', income: 'bridge', known: 'opportunities', unsure: 'directions' };
  const STEPS = ['Your goal', 'The essentials', 'Optional context', 'Review'];
  const DRAFT_KEY = 'reboundops.intake-draft.v1';
  const EXAMPLE = {
    goal: 'similar', role: 'Software Engineer', weeklyHours: 4, urgency: 'soon',
    priorities: 'Keep remote options open; protect weekday evenings.', location: 'Remote (example)',
    shiftTarget: 'Developer Experience Engineer', bridgeTarget: 'Contract CI/CD pipeline review',
    achievements: 'Cut a test suite runtime from 30 to 12 minutes for a fictional team (Example Corp)',
    example: true,
  };

  let draft = null;
  let step = 0;
  let editing = null;   // the session being edited, if any
  let keepDraft = false;

  function blank() {
    return { goal: '', role: '', weeklyHours: 4, urgency: 'soon', priorities: '', location: '', shiftTarget: '', bridgeTarget: '', achievements: '', example: false };
  }
  function loadDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
      const defaults = blank();
      if (!saved || !Number.isInteger(saved.step) || saved.step < 0 || saved.step >= STEPS.length ||
          !saved.answers || Object.keys(defaults).some(key => typeof saved.answers[key] !== typeof defaults[key])) return;
      const answers = saved.answers;
      if ((answers.goal && !Object.hasOwn(RS.GOALS, answers.goal)) ||
          !Object.hasOwn(URGENCY, answers.urgency) || !Number.isInteger(answers.weeklyHours) ||
          answers.weeklyHours < 1 || answers.weeklyHours > 20 || answers.example) return;
      draft = answers;
      step = saved.step;
      keepDraft = true;
    } catch { /* Storage may be unavailable or the saved draft malformed. */ }
  }
  function saveDraft() {
    if (keepDraft && !editing && !draft.example) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, answers: draft }));
    }
  }
  function fromSession(s) {
    const i = s.intake;
    return {
      goal: RS.get().goal || 'unsure', role: i.role, weeklyHours: i.weeklyHours, urgency: i.urgency,
      priorities: i.priorities.replace(/^Goal: [^.]*\.\s*/, ''), location: i.location,
      shiftTarget: i.shiftTarget, bridgeTarget: i.bridgeTarget,
      achievements: i.evidence.map((e) => e.claim).join('\n'), example: false,
    };
  }
  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const b = window.crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const x = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
  }
  function achievementLines() {
    const saved = editing?.intake.evidence.map(item => item.claim);
    if (saved && draft.achievements === saved.join('\n')) return saved;
    return draft.achievements.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  function toIntake() {
    const goal = RS.GOALS[draft.goal];
    const prior = [...(editing?.intake.evidence || [])];
    const previous = editing && fromSession(editing);
    const priorities = previous && previous.goal === draft.goal && previous.priorities === draft.priorities
      ? editing.intake.priorities
      : [goal ? `Goal: ${goal.label}.` : '', draft.priorities.trim()].filter(Boolean).join(' ').slice(0, 1200);
    return {
      role: draft.role.trim(), location: draft.location.trim(), weeklyHours: Number(draft.weeklyHours), urgency: draft.urgency,
      priorities,
      shiftTarget: draft.shiftTarget.trim(), bridgeTarget: draft.bridgeTarget.trim(),
      evidence: achievementLines().map((claim) => {
        const index = prior.findIndex(item => item.claim === claim);
        if (index >= 0) return prior.splice(index, 1)[0];
        return { id: uuid(), claim, source: { kind: 'manual', label: 'Self-reported in ReboundOps' }, status: 'unverified' };
      }),
    };
  }

  // ──────────────────────────────── steps ────────────────────────────────
  function stepper() {
    return h('ol', { className: 'rj-steps', 'aria-label': 'Progress' }, STEPS.map((label, i) => h('li', {
      className: 'rj-steps__item' + (i < step ? ' is-done' : '') + (i === step ? ' is-current' : ''),
      'aria-current': i === step ? 'step' : null,
    }, [h('span', { className: 'rj-steps__stone', 'aria-hidden': 'true' }), h('span', { className: 'rj-steps__label', text: label })])));
  }

  function stepGoal(go) {
    const known = h('div', { className: 'rj-known', hidden: draft.goal !== 'known' }, [
      h('p', { className: 'rj-known__title', text: 'Two ways to continue' }),
      h('p', { text: 'You can plan a week around your target role here, or skip the recovery plan and go straight to the job-search tools. You can come back to the plan at any time.' }),
      h('div', { className: 'rj-actions' }, [
        h('button', { type: 'button', className: 'rj-btn rj-btn--primary', onclick: () => go(1), text: 'Plan around my target' }),
        h('button', { type: 'button', className: 'rj-btn', text: 'Go straight to job search', onclick: () => { RS.setPrefersTools(true); RS.markVisited(); Router.go('/dashboard'); } }),
      ]),
    ]);
    const cont = h('button', { type: 'button', className: 'rj-btn rj-btn--primary', text: 'Continue', disabled: !draft.goal || draft.goal === 'known', onclick: () => go(1) });
    const choices = h('fieldset', { className: 'rj-goals' }, [
      h('legend', { className: 'visually-hidden', text: 'What would help you move forward right now?' }),
      ...Object.entries(RS.GOALS).map(([key, g]) => h('label', { className: 'rj-goal' }, [
        h('input', { type: 'radio', name: 'rj-goal', value: key, checked: draft.goal === key, onchange: () => {
          draft.goal = key; known.hidden = key !== 'known'; cont.disabled = key === 'known'; cont.hidden = key === 'known';
        } }),
        h('span', { className: 'rj-goal__icon' }, [icon(GOAL_ICON[key], 22)]),
        h('span', { className: 'rj-goal__text' }, [h('span', { className: 'rj-goal__label', text: g.label }), h('span', { className: 'rj-goal__line', text: g.line })]),
      ])),
    ]);
    cont.hidden = draft.goal === 'known';
    return [
      choices, known,
      h('div', { className: 'rj-actions' }, [
        cont,
        h('button', { type: 'button', className: 'rj-btn rj-btn--quiet', text: 'Use a fictional example', onclick: () => { draft = { ...EXAMPLE }; go(3); } }),
      ]),
      RS.hasSession() ? h('p', { className: 'rj-aside' }, ['Already have a plan? ', h('a', { href: '#/recovery', text: 'Go to my next step' })]) : null,
    ];
  }

  function field(id, label, control, hint) {
    control.id = id;
    if (hint) control.setAttribute('aria-describedby', id + '-hint');
    return h('div', { className: 'rj-field' }, [h('label', { for: id, className: 'rj-field__label', text: label }), hint ? h('p', { id: id + '-hint', className: 'rj-field__hint', text: hint }) : null, control]);
  }

  function stepEssentials(go, say) {
    const role = h('input', { className: 'rj-input', autocomplete: 'organization-title', maxLength: 120, value: draft.role, required: true, oninput: (e) => { draft.role = e.target.value; } });
    const hoursOut = h('output', { className: 'rj-range__out', for: 'rj-hours' });
    const paintHours = () => { hoursOut.textContent = `${draft.weeklyHours} ${Number(draft.weeklyHours) === 1 ? 'hour' : 'hours'} a week`; };
    const hours = h('input', { type: 'range', min: '1', max: '20', step: '1', value: String(draft.weeklyHours), className: 'rj-range', oninput: (e) => { draft.weeklyHours = Number(e.target.value); paintHours(); } });
    paintHours();
    const urgency = h('fieldset', { className: 'rj-options' }, [
      h('legend', { className: 'rj-field__label', text: 'When do you need a change?' }),
      ...Object.entries(URGENCY).map(([v, label]) => h('label', { className: 'rj-option' }, [
        h('input', { type: 'radio', name: 'rj-urgency', value: v, checked: draft.urgency === v, onchange: () => { draft.urgency = v; } }), h('span', { text: label }),
      ])),
    ]);
    return [
      field('rj-role', 'Your current or most recent role', role, 'For example "Software Engineer". This is your starting point, not a commitment.'),
      h('div', { className: 'rj-field' }, [h('label', { for: 'rj-hours', className: 'rj-field__label', text: 'How much time can you give this each week?' }), h('p', { className: 'rj-field__hint', text: 'Your seven-day plan will never ask for more than this.' }), Object.assign(hours, { id: 'rj-hours' }), hoursOut]),
      urgency,
      h('div', { className: 'rj-actions' }, [
        h('button', { type: 'button', className: 'rj-btn rj-btn--primary', text: 'Continue', onclick: () => {
          if (!draft.role.trim()) { say('Please enter your current or most recent role.'); role.setAttribute('aria-invalid', 'true'); role.focus(); return; }
          go(2);
        } }),
        h('button', { type: 'button', className: 'rj-btn rj-btn--quiet', text: 'Back', onclick: () => go(0) }),
      ]),
    ];
  }

  function stepOptional(go, say) {
    const area = (key, rows, max) => h('textarea', { className: 'rj-input', rows, maxLength: max, value: draft[key], oninput: (e) => { draft[key] = e.target.value; } });
    const input = (key, max) => h('input', { className: 'rj-input', maxLength: max, value: draft[key], oninput: (e) => { draft[key] = e.target.value; } });
    const goal = draft.goal;
    const targetFields = [];
    if (goal === 'known' || goal === 'new') targetFields.push(field('rj-shift', goal === 'known' ? 'The role you are aiming for' : 'A new direction you would like to test', input('shiftTarget', 140)));
    if (goal === 'income') targetFields.push(field('rj-bridge', 'Stepping-stone or contract work you could do', input('bridgeTarget', 140)));
    const otherTargets = (goal === 'similar' || goal === 'unsure') ? h('details', { className: 'rj-more' }, [
      h('summary', { text: 'Have another direction in mind?' }),
      field('rj-shift', 'A new direction to test', input('shiftTarget', 140)),
      field('rj-bridge', 'Stepping-stone or contract work', input('bridgeTarget', 140)),
    ]) : null;
    return [
      h('p', { className: 'rj-lede', text: 'All of these are optional. Skip anything you would rather not share.' }),
      ...targetFields,
      field('rj-priorities', 'What matters most to you right now?', area('priorities', 3, 1000), 'Constraints or wishes, e.g. "remote only", "no on-call", "need income by spring".'),
      field('rj-ach', 'Something you are proud of from your work', area('achievements', 3, 7500), 'One per line. These are self-reported — you can review them later. Please do not paste confidential employer details.'),
      field('rj-loc', 'Where you would like to work', input('location', 160)),
      otherTargets,
      h('div', { className: 'rj-actions' }, [
        h('button', { type: 'button', className: 'rj-btn rj-btn--primary', text: 'Continue', onclick: () => {
          const lines = achievementLines();
          if (lines.length > 15) { say('Please keep it to 15 achievements or fewer.'); return; }
          if (lines.some((l) => l.length > 500)) { say('Each achievement needs to be under 500 characters.'); return; }
          go(3);
        } }),
        h('button', { type: 'button', className: 'rj-btn rj-btn--quiet', text: 'Back', onclick: () => go(1) }),
        h('button', { type: 'button', className: 'rj-btn rj-btn--link', text: 'Skip this step', onclick: () => go(3) }),
      ]),
    ];
  }

  function stepReview(go, say) {
    const row = (label, value, toStep) => h('div', { className: 'rj-review__row' }, [
      h('dt', { text: label }),
      h('dd', {}, [h('span', { text: value || 'Not added' }), h('button', { type: 'button', className: 'rj-btn rj-btn--link', text: 'Change', 'aria-label': `Change ${label.toLowerCase()}`, onclick: () => go(toStep) })]),
    ]);
    const lines = achievementLines();
    const submit = h('button', { type: 'submit', className: 'rj-btn rj-btn--primary', text: editing ? 'Save my answers' : 'Compare my directions' });
    const saveLocally = h('input', { type: 'checkbox' });
    const form = h('form', { className: 'rj-review', novalidate: true }, [
      draft.example ? h('p', { className: 'rj-tag rj-tag--example', text: 'Example — fictional answers' }) : null,
      h('dl', {}, [
        row('Goal', RS.GOALS[draft.goal] ? RS.GOALS[draft.goal].label : '', 0),
        row('Current or recent role', draft.role, 1),
        row('Time each week', `${draft.weeklyHours} ${Number(draft.weeklyHours) === 1 ? 'hour' : 'hours'}`, 1),
        row('Timing', URGENCY[draft.urgency], 1),
        row('What matters', draft.priorities.trim(), 2),
        row('Directions in mind', [draft.shiftTarget.trim(), draft.bridgeTarget.trim()].filter(Boolean).join(' · '), 2),
        row('Achievements', lines.length ? `${lines.length} self-reported` : '', 2),
        row('Location', draft.location.trim(), 2),
      ]),
      h('details', { className: 'rj-privacy' }, [
        h('summary', {}, [icon('lock', 16), 'Your answers stay on this computer. How?']),
        h('p', { text: 'Your answers go to the ReboundOps service on this computer and stay in memory unless you choose local saving. The browser keeps a plan reference and holds unfinished answers only if you enable draft recovery. Saved files and JSON downloads contain your career data. This step sends nothing to AI and writes nothing into job-search files.' }),
      ]),
      !editing ? h('label', {}, [saveLocally, ' Save on this computer after each change (recommended). Local files are plaintext; use a private account. Leave unchecked for memory only: work is lost when the app stops unless you download a JSON backup.']) : null,
      editing ? h('p', { className: 'rj-measure', text: 'Your plan and check-in stay saved. A lower time limit applies to your next plan if this one no longer fits. Removing or rewriting achievements clears their review links and any correction history for removed claims. Use Open full recovery to correct a claim and keep its history.' }) : null,
      h('div', { className: 'rj-actions' }, [submit, h('button', { type: 'button', className: 'rj-btn rj-btn--quiet', text: 'Back', onclick: () => go(draft.example ? 0 : 2) })]),
    ]);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!draft.role.trim()) { say('Please add your current or most recent role.'); return go(1); }
      submit.disabled = true; say(editing ? 'Saving…' : 'Creating your plan…');
      const intake = toIntake();
      const r = editing
        ? await RS.call('PUT', `/sessions/${editing.id}/intake`, { expectedRevision: editing.revision, intake })
        : await RS.call('POST', '/sessions', { intake });
      if (!r.ok) {
        if (r.status === 409 && r.data && r.data.session) RS.setSession(r.data.session);
        submit.disabled = false; say(errorText(r)); return;
      }
      RS.setGoal(draft.goal); RS.markVisited(); RS.setPrefersTools(false); RS.setSession(r.data);
      if (!editing && saveLocally.checked) {
        const saved = await RS.call('PUT', `/sessions/${r.data.id}/persistence`, { expectedRevision: r.data.revision, mode: 'disk' });
        if (saved.ok) RS.setSession(saved.data);
        else { window.UI.toast('Your plan is in memory; local saving failed. Download a JSON backup from My next step. ' + errorText(saved), 'error'); }
      }
      if (!editing && keepDraft && !draft.example) {
        try { localStorage.removeItem(DRAFT_KEY); keepDraft = false; }
        catch { window.UI.toast('The browser draft could not be removed. Clear it from Start on this browser.', 'error'); }
      }
      draft = null; editing = null; step = 0;
      Router.go('/recovery');
    });
    return [form];
  }

  // ──────────────────────────────── view ────────────────────────────────
  Router.register('start', async (params) => {
    RS.markVisited();
    const resumePanel = await RS.dataControls();
    const isEdit = params && params[0] === 'edit';
    if (isEdit) {
      if (!RS.session()) await RS.load();
      const s = RS.session();
      if (s && (!editing || editing.id !== s.id)) { editing = s; draft = fromSession(s); step = 3; }
    } else if (editing) { editing = null; draft = null; step = 0; }
    if (!draft) { draft = blank(); step = 0; if (!isEdit) loadDraft(); }

    const root = h('div', { className: 'rj rj-start' });
    const say = status();
    const body = h('div', { className: 'rj-start__body' });
    const remember = h('input', { type: 'checkbox', checked: keepDraft });
    const draftStatus = status();
    function persistDraft() {
      try { saveDraft(); }
      catch { draftStatus.textContent = 'This browser could not save your draft. Keep this tab open to finish.'; }
    }
    remember.addEventListener('change', () => {
      try {
        if (!remember.checked) localStorage.removeItem(DRAFT_KEY);
        keepDraft = remember.checked;
        saveDraft();
        draftStatus.textContent = keepDraft ? 'Draft recovery is on.' : 'Saved draft removed.';
      } catch {
        keepDraft = !remember.checked;
        remember.checked = keepDraft;
        draftStatus.textContent = 'This browser could not change draft saving.';
      }
    });
    const titles = ['What would help you move forward right now?', 'Start with the essentials', 'Anything else that matters?', editing ? 'Review your changes' : 'Check your answers'];
    const ledes = [
      'Pick the closest fit. It shapes the directions you will compare — you still choose.',
      'Three quick answers so your week fits your real time.',
      null,
      'Change anything before ReboundOps builds three directions for you to compare.',
    ];
    function go(n) {
      step = n;
      say.textContent = '';
      const hd = header(editing ? 'Edit my answers' : `Step ${step + 1} of 4 · ${STEPS[step]}`, titles[step], ledes[step]);
      const content = step === 0 ? stepGoal(go) : step === 1 ? stepEssentials(go, (m) => { say.textContent = m; }) : step === 2 ? stepOptional(go, (m) => { say.textContent = m; }) : stepReview(go, (m) => { say.textContent = m; });
      body.replaceChildren(hd, stepper(), ...content.filter(Boolean), say);
      persistDraft();
      const t = body.querySelector('h1');
      if (t && document.activeElement !== document.body) { t.setAttribute('tabindex', '-1'); t.focus(); }
    }
    body.addEventListener('input', persistDraft);
    body.addEventListener('change', persistDraft);
    root.append(body);
    if (!editing) root.append(h('div', { className: 'rj-aside' }, [
      h('label', {}, [remember, ' Keep my unfinished answers in this browser']),
      h('p', { text: 'Without this option, refreshing or closing the tab discards unfinished answers. A saved draft stays on this browser until you submit it or turn this off. Use it on a private device.' }),
      draftStatus,
    ]));
    go(step);
    root.append(h('p', null, [h('a', { href: '#/ai-setup', text: 'Set up AI assistance (optional) →' })]));
    root.append(resumePanel);
    return root;
  });

  // Re-exported for tests.
  window.JourneyStart = { _reset() { draft = null; step = 0; editing = null; }, confirm };
})();
