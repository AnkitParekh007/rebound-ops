/* global Router, Journey, ReboundState, API */
Router.register('guide', async () => {
  const { h, header } = Journey;
  const root = h('div', { className: 'rj' });
  const results = await Promise.allSettled([
    ReboundState.hasSession() ? ReboundState.load() : Promise.resolve(null),
    API.get('/api/cv'), API.get('/api/tracker'), ReboundState.call('GET', '/runtime'), ReboundState.call('GET', '/sessions/saved')
  ]);
  const session = results[0].status === 'fulfilled' && results[0].value?.ok ? results[0].value.data : null;
  const cv = results[1].status === 'fulfilled' ? results[1].value : null;
  const tracker = results[2].status === 'fulfilled' ? results[2].value : null;
  const savedCount = results[4].status === 'fulfilled' && results[4].value?.ok && Array.isArray(results[4].value.data) ? results[4].value.data.length : 0;
  const recoveryAvailable = results[4].status === 'fulfilled' && results[4].value?.ok;
  let full = 'recovery';
  if (session && results[3].status === 'fulfilled' && results[3].value?.ok) {
    try {
      const url = new URL(results[3].value.data.recoveryUrl);
      if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && !url.username && !url.password) { url.searchParams.set('session', session.id); url.hash = 'evidence'; full = url.href; }
    } catch { /* the plan page retains a retryable full-interface link */ }
  }
  const confirmed = session?.intake.evidence.filter(item => item.status === 'confirmed').length || 0;
  const card = (title, status, description, links) => h('li', { className: 'rj-guide-card' }, [
    h('h2', { text: title }), h('p', { className: 'rj-kicker', text: status }),
    h('p', { text: description }), h('div', { className: 'rj-actions' }, links.map(([label, route]) => h('a', { className: 'rj-btn rj-btn--quiet', href: route.startsWith('http:') ? route : '#/' + route, ...(route.startsWith('http:') ? { target: '_blank', rel: 'noopener noreferrer' } : {}), text: label })))
  ]);
  root.append(header('Your workspace guide', 'From uncertainty to one useful action', 'You can work without AI. These are separate records in one local workspace: review each handoff before saving. Status describes saved records, not verified career outcomes.'));
  root.append(h('ol', { className: 'rj-guide-list' }, [
    card('1. Choose a manageable direction', session?.plan ? 'Plan available' : session ? 'Answers available — choose a direction' : !recoveryAvailable ? 'Recovery status unavailable — open My next step to retry' : savedCount ? `${savedCount} saved recovery records available — resume deliberately` : 'Start here', 'Describe your constraints, compare hypotheses and choose one week of work. You can change direction later.', [['My next step', session || savedCount || !recoveryAvailable ? 'recovery' : 'start'], ['Compare directions', 'directions']]),
    card('2. Separate evidence from gaps', recoveryAvailable ? `${confirmed} achievements reviewed by you` : 'Evidence status unavailable — retry the recovery service', 'Check your achievements against their sources. In the full recovery interface, paste a job’s requirements, link evidence and mark gaps. A review is not independent verification.', [['My evidence', 'evidence'], ['Full evidence and requirement controls', full]]),
    card('3. Prepare your application materials', cv ? (cv.markdown?.trim() ? 'CV text available — review before use' : 'No saved CV yet') : 'CV status unavailable — open the editor to check', 'Import or edit your résumé. Reuse selected recovery achievements and profile fields deliberately; they are not silently synchronized. Export a PDF and inspect it.', [['CV editor', 'cv'], ['Profile and context', 'config?tab=profile'], ['Check facts and mask identifiers', 'cv-studio']]),
    card('4. Find and review an opportunity', 'Employer availability changes; inspect each listing', 'Add a supported employer board, review the actual query and location, then scan. A failed source is not an empty market. Use the job description to identify a gap, not a hiring prediction.', [['Source setup', 'portals'], ['Find opportunities', 'opportunities'], ['Review a job', 'evaluate']]),
    card('5. Record what you actually did', tracker ? `${tracker.rows?.length || 0} application records` : 'Application status unavailable — open the tracker to check', 'Add your first application manually. Record whether you applied, received a response or decided not to proceed. Preparing a résumé does not submit it.', [['Applications — add or update a record', 'tracker']]),
    card('6. Save, return and reflect', session ? (session.persistence === 'disk' ? 'Recovery saving enabled on this computer' : 'Recovery is memory-only — choose saving or download a backup') : 'Choose saving when your plan is created', 'Recovery saving and workspace files have separate storage. Download a combined career backup to keep both. Backups are plaintext and exclude provider keys and generated PDFs; keep them outside Git and shared folders.', [['Saving and combined backup', 'recovery'], ['AI setup (optional)', 'ai-setup']])
  ]));
  root.append(h('h2', { text: 'A first session is complete when…' }), h('p', { text: 'You have one action you understand, one uncertainty to test, and a deliberate saving or backup choice. You do not need to visit every tool or configure AI.' }), h('p', {}, [h('a', { href: 'https://rebound-ops.org/docs/', target: '_blank', rel: 'noopener noreferrer', text: 'Installation, privacy and troubleshooting documentation ↗' })]));
  return root;
});
