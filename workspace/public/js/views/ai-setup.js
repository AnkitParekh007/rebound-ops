/* global Router, API, Journey */
Router.register('ai-setup', async () => {
  const { h } = window.Journey;
  const root = h('div', { className: 'rj rj-ai-setup' });
  root.append(h('h1', { text: 'Set up AI assistance' }),
    h('p', { text: 'Recovery AI uses Anthropic. Workspace AI tools have separate settings. Core recovery works without AI.' }));
  const state = h('p', { role: 'status', text: 'Checking recovery AI configuration…' });
  const message = h('p', { role: 'status' });
  const test = h('button', { className: 'rj-btn', type: 'button', text: 'Test connection — contact Anthropic', disabled: true });
  const refresh = h('button', { className: 'rj-btn', type: 'button', text: 'Refresh AI status' });
  async function load() {
    try {
      const s = await API.get('/api/rebound/ai/status');
      const label = !s.enabled ? 'AI not configured' : s.connectionStatus === 'connected' ? 'AI connected — verified in this server process' : s.connectionStatus === 'failed' ? 'Connection test failed' : 'Configured — connection not tested';
      state.textContent = `Recovery AI: ${label}${s.enabled ? ` · ${s.provider} · ${s.model}` : ''}`;
      test.disabled = !s.enabled;
    } catch { state.textContent = 'Recovery service unavailable. Check the launcher terminal.'; test.disabled = true; }
  }
  refresh.addEventListener('click', load);
  test.addEventListener('click', async () => {
    test.disabled = true; refresh.disabled = true; message.textContent = 'Testing model access…';
    try {
      await API.post('/api/rebound/ai/test-connection', { consent: true });
      message.textContent = 'Connection verified. Career reviews still require payload preview and consent.';
    } catch { message.textContent = 'Connection could not be verified. Check the server flag, key, model access and network. Wait 30 seconds before retrying.'; }
    finally { await load(); refresh.disabled = false; }
  });
  root.append(state,
    h('h2', { text: '1. Configure the local server' }),
    h('p', { text: 'Create a key in your Anthropic account and set a provider-side spend limit. Stop the launcher, then run these commands from the repository root in Bash. The key is entered privately in the terminal; do not paste it into a browser or commit it.' }),
    h('pre', { tabindex: '0', 'aria-label': 'AI setup terminal commands', text: "read -rsp 'Anthropic API key: ' ANTHROPIC_API_KEY; echo\nexport ANTHROPIC_API_KEY\nbash scripts/start-demo.sh --ai" }),
    h('p', { text: 'Set REBOUNDOPS_ANTHROPIC_MODEL to override the server default. Environment files are not loaded automatically. Restarting clears the connection-test result, not your provider account.' }),
    h('h2', { text: '2. Verify access' }),
    h('p', { text: 'Testing contacts Anthropic for metadata about the configured model. It sends no career records and does not generate text. A successful test verifies access, not advice quality. One test is allowed per 30 seconds.' }),
    h('div', { className: 'rj-actions' }, [refresh, test]), message,
    h('h2', { text: '3. Preview and approve a review' }),
    h('p', { text: 'Use Open full recovery from Start or My next step to continue the same session. Switching interfaces needs no restart. Enabling AI for the first time requires restarting the launcher with --ai and the key exported; save your session or download a JSON backup first. Add a job target, confirm evidence and preview the exact payload before consenting. Provider charges may apply. Suggestions never update evidence automatically.' }),
    h('p', null, [h('a', { href: '#/config?tab=api-keys', text: 'Workspace AI provider settings' })]),
    h('p', null, [h('a', { href: 'https://rebound-ops.org/docs/ai/', target: '_blank', rel: 'noopener', text: 'Recovery AI setup guide ↗' })]),
    h('p', null, [h('a', { href: '#/recovery', text: 'Open my plan and backup controls →' })]),
    h('p', null, [h('a', { href: '#/start', text: 'Continue without AI →' })]));
  await load(); return root;
});
