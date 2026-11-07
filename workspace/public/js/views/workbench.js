/* global Router, API, Journey, ReboundState */
/** ReboundOps search workbench. Original composition over credited, existing APIs.
 * No ranking, inferred fit or automatic writes: the person chooses a next action.
 */
(function () {
  const { h, icon } = Journey;
  const RS = ReboundState;
  const previousDashboard = Router.renderer('dashboard');
  if (previousDashboard) Router.register('tools-dashboard', previousDashboard);
  const link = (href, text, primary = false) => h('a', { className: 'rj-btn' + (primary ? ' rj-btn--primary' : ''), href, text });
  const paragraph = text => h('p', { text });
  function task(number, title, body, href, action) {
    return h('article', { className: 'rw-task' }, [h('span', { className: 'rw-number', text: number }), h('div', {}, [h('h3', { text: title }), paragraph(body), link(href, action)])]);
  }
  function record(row) {
    return h('li', {}, [h('strong', { text: row.role || row.title || 'Role not named' }), h('span', { text: row.company || 'Company not named' }), h('span', { className: 'rw-record-status', text: row.status || 'Not recorded' })]);
  }
  Router.register('dashboard', async () => {
    if (RS.hasSession() && !RS.session()) await RS.load();
    let tracker = null;
    try {
      const data = await API.get('/api/tracker');
      if (Array.isArray(data && data.rows)) tracker = data.rows;
    } catch { /* Show an unavailable state, never an inferred zero. */ }
    const session = RS.session();
    const summary = RS.summary();
    const next = summary && summary.next;
    const confirmed = session ? session.intake.evidence.filter(item => item.status === 'confirmed').length : 0;
    const root = h('div', { className: 'rj rw-workbench', 'data-testid': 'search-workbench' });
    root.append(h('header', { className: 'rw-heading' }, [h('p', { className: 'rj-kicker', text: 'ReboundOps / search workbench' }), h('h1', { text: 'A search with a direction.' }), paragraph(summary && summary.target ? `You are testing: ${summary.target}. Keep your next decision grounded in what you can show.` : 'Choose a useful next move, then use the tools that serve it.'), h('div', { className: 'rj-actions' }, [link('#/recovery', session ? 'Return to my plan' : 'Build my recovery plan', true), link('#/scan', 'Explore opportunities')])]));
    if (tracker === null) root.append(h('div', { className: 'rj-warn', role: 'status' }, [paragraph('Some job-search records could not be loaded. No counts or outcomes have been inferred.'), h('button', { type: 'button', className: 'rj-btn', text: 'Try loading again', onclick: () => Router.render() })]));
    const focus = h('section', { className: 'rw-focus', 'aria-labelledby': 'rw-focus-title' }, [h('div', {}, [h('p', { className: 'rj-kicker', text: 'Your next useful step' }), h('h2', { id: 'rw-focus-title', text: next ? next.title : session ? 'Review the direction you want to test.' : 'Decide what you want to test first.' }), paragraph(next ? `About ${Journey.duration(next.minutes)}. Complete it in your recovery plan; this workspace does not mark it done for you.` : 'A focused direction gives each opportunity a question to answer. Start with your experience and constraints.'), link(session ? '#/recovery' : '#/start', next ? 'Open this step' : 'Explore my next move', true)]), h('aside', { className: 'rw-evidence' }, [icon('evidence', 28), h('h3', { text: 'Keep an evidence anchor.' }), paragraph(session ? `${confirmed} of ${session.intake.evidence.length} achievements confirmed by you. Confirmation is your review, not independent verification.` : 'Your recovery evidence and job-search profile are separate records. No career claims are invented or silently synchronized.'), link(session ? '#/evidence' : '#/start', session ? 'Review my evidence' : 'Start with my experience')])]);
    root.append(focus);
    root.append(h('section', { 'aria-labelledby': 'rw-decisions' }, [h('h2', { id: 'rw-decisions', text: 'Three useful decisions.' }), h('div', { className: 'rw-tasks' }, [task('01', 'Is this role worth exploring?', 'Read the actual requirements and choose one question to investigate. A tool score is not a hiring prediction.', '#/scan', 'Open opportunity lens'), task('02', 'What can I show?', 'Prepare a sourced example or review application material against your real experience.', '#/cv', 'Open my CV workspace'), task('03', 'What needs my attention?', 'Review application notes, prepare for a conversation, or record a follow-up you choose to send.', '#/tracker', 'Review applications')])]));
    const applications = tracker || [];
    const active = applications.filter(row => !/^(rejected|discarded|skip|hired|withdrawn)$/i.test(row.status || ''));
    const conversations = active.filter(row => /interview|responded|assessment|offer/i.test(row.status || ''));
    root.append(h('section', { className: 'rw-records', 'aria-labelledby': 'rw-records-title' }, [h('div', { className: 'rw-records-title' }, [h('h2', { id: 'rw-records-title', text: 'Your working set.' }), link('#/tracker', 'Open all applications')]), h('div', { className: 'rw-record-columns' }, [h('article', {}, [h('h3', { text: 'Applications to revisit' }), paragraph(tracker === null ? 'Records unavailable.' : `${active.length} open application records. Choose what deserves your attention.`), tracker === null ? paragraph('Try loading the records again before choosing an application.') : active.length ? h('ul', { className: 'rw-record-list' }, active.slice(0, 4).map(record)) : paragraph('No open application records yet. Add one in Applications when you decide to pursue a role.')]), h('article', {}, [h('h3', { text: 'Conversations to prepare for' }), paragraph(tracker === null ? 'Records unavailable.' : `${conversations.length} records marked responded, assessment, interview or offer.`), tracker === null ? paragraph('Conversation records could not be checked.') : conversations.length ? h('ul', { className: 'rw-record-list' }, conversations.slice(0, 4).map(record)) : paragraph('When you record a conversation stage, it appears here. These are your recorded statuses, not predicted outcomes.')])])]));
    const tools = h('details', { className: 'rw-advanced' }, [h('summary', { text: 'Advanced job-search tools and diagnostics' }), paragraph('Explore statistics, manage your pipeline and review follow-ups without replacing your recovery decisions.'), h('div', { className: 'rj-actions' }, [link('#/tools-dashboard', 'Tool statistics'), link('#/pipeline', 'Pipeline'), link('#/followup', 'Follow-ups')])]);
    root.append(tools);
    return root;
  });

})();
