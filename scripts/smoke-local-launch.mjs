/** Real first-use regression: isolated checkout, advertised launcher, browser UI. */
import assert from 'node:assert/strict';
import { smokeWorkspaceReadiness } from './smoke-workspace-readiness.mjs';
import { smokeWorkspaceUsability } from './smoke-workspace-usability.mjs';
import { fork, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

async function freePort() {
  const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;await new Promise(r=>server.close(r));return port;
}
async function waitForHealth(origin, child, log, budgetMs) {
  const deadline = Date.now() + budgetMs;
  while (true) {
    if (child.exitCode !== null || child.signalCode !== null) throw Error('Launcher exited before readiness: ' + log());
    try { if ((await fetch(origin + '/api/rebound/health')).ok) return; } catch {}
    assert(Date.now() < deadline, 'Launcher readiness timeout: ' + log());
    await new Promise(r => setTimeout(r, 250));
  }
}

async function stopLauncher(child, signal) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolveExit, reject) => {
    const timeout = setTimeout(() => reject(new Error('Launcher did not stop after ' + signal)), 8000);
    child.once('exit', () => { clearTimeout(timeout); resolveExit(); });
    if (process.platform === 'win32') child.disconnect();
    else child.kill(signal);
  });
}

async function assertPortReleased(port) {
  const probe = net.createServer();
  await new Promise((ready, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(ready));
  });
}

export async function runLaunchSmoke(checkout) {
  const port=await freePort(), apiPort=await freePort();
  const dataHome=mkdtempSync(join(tmpdir(),'rebound-smoke-data-'));
  const env={...process.env,XDG_DATA_HOME:dataHome,PORT:String(port),REBOUNDOPS_API_PORT:String(apiPort),REBOUND_OPS_ROOT:join(checkout,'engine'),REBOUNDOPS_AI_ENABLED:'false'};
  for(const key of Object.keys(env))if(/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/.test(key))delete env[key];
  delete env.REBOUNDOPS_DATA_DIR;delete env.REBOUNDOPS_AI_COUNTER_FILE;
  let log='',browser,child;
  const start = () => {
    child = fork(join(checkout, 'scripts', 'start.mjs'), [], { cwd:checkout, env, stdio:['ignore','pipe','pipe','ipc'] });
    child.stdout.on('data',d=>{log=(log+d).slice(-20000);process.stdout.write(d);});
    child.stderr.on('data',d=>{log=(log+d).slice(-20000);process.stderr.write(d);});
  };
  const origin=`http://127.0.0.1:${port}`;
  try {
    start();
    // Windows cold npm ci can take three minutes before Chromium/build even
    // starts. This budget covers provisioning, not service readiness: the
    // launcher still checks each running service with its own short timeout.
    await waitForHealth(origin, child, () => log, process.platform === 'win32' ? 480000 : 240000);
    const {chromium}=createRequire(join(checkout,'engine','package.json'))('playwright');
    browser=await chromium.launch({headless:true,...(env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
    const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(20000);
    await page.goto(origin+'/#/cv');await page.locator('#cv-editor').waitFor();
    await page.locator('#cv-editor').fill('# Fictional startup test\n\n## Experience\n- Built a fictional Node.js API.\n\n## Skills\nTypeScript, PostgreSQL.');
    const saved=page.waitForResponse(r=>r.url().endsWith('/api/cv')&&r.request().method()==='PUT');
    await page.locator('#content button').filter({hasText:/^Save$/}).click();assert.equal((await saved).status(),200);
    // Exercise the exact false-success regression through the actual CV view.
    const downloads=[];page.on('download',d=>downloads.push(d));
    await page.route('**/api/stream/pdf',r=>r.fulfill({contentType:'text/event-stream',body:'event: done\ndata: {"code":1}\n\n'}));
    await page.getByRole('button',{name:'Generate PDF',exact:true}).click();
    await page.getByText(/PDF export failed/).first().waitFor();
    assert.equal(downloads.length,0);assert.equal(await page.getByRole('button',{name:'Generate PDF',exact:true}).isEnabled(),true);
    assert.equal(await page.getByText('PDF generated',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.unroute('**/api/stream/pdf');
    const downloadPromise=page.waitForEvent('download',{timeout:60000});
    await page.getByRole('button',{name:'Generate PDF',exact:true}).click();const download=await downloadPromise;
    const path=await download.path();assert(readFileSync(path).subarray(0,5).equals(Buffer.from('%PDF-')));
    await page.getByRole('button',{name:'Close dialog',exact:true}).click();
    // Open Import CSV only once the tracker has rendered from its own data: the
    // overflow menu closes itself on a route change, scroll or outside click, so
    // a click while the view is still settling can end with no picker (one macOS
    // CI flake, run 43193155351). Retry the open/click a bounded number of times;
    // a real regression (no picker at all) still fails every attempt.
    const trackerLoaded=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tracker'&&r.request().method()==='GET');
    await page.goto(origin+'/#/tracker');await trackerLoaded;
    const moreActions=page.getByRole('button',{name:'More actions',exact:true});await moreActions.waitFor({state:'visible'});
    let chooser=null;
    for(let attempt=1;attempt<=3&&!chooser;attempt++){
      if(await page.getByRole('menu',{name:'More actions'}).count()===0)await moreActions.click();
      const chooserPromise=page.waitForEvent('filechooser',{timeout:7000}).catch(()=>null);
      // A menu that closed before this click must not end the retry early.
      await page.getByRole('menuitem',{name:'Import CSV',exact:true}).click({timeout:7000}).catch(()=>{});
      chooser=await chooserPromise;
      if(!chooser)console.warn(`Import CSV opened no file chooser (attempt ${attempt}/3); retrying.`);
    }
    assert(chooser,'Import CSV never opened a file chooser');
    await chooser.setFiles({name:'fictional-startup.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Company,Role,Status,Notes\n2026-11-09,Fictional Startup Studio,Backend Engineer,Applied,Fictional regression record\n')});
    await page.getByRole('button',{name:'Import rows (1)',exact:true}).click();
    const status=page.getByRole('combobox',{name:'Change application status',exact:true}).first();
    const statusResponse=page.waitForResponse(r=>r.url().endsWith('/api/tracker/status'));await status.selectOption('Responded');assert.equal((await statusResponse).status(),200);
    await page.getByRole('button',{name:'Record outcome — Fictional Startup Studio',exact:true}).click();await page.getByRole('combobox',{name:'Record outcome',exact:true}).selectOption('interview_progress');await page.getByRole('textbox',{name:'Note (optional)',exact:true}).fill('Fictional note');await page.getByRole('button',{name:'Preview',exact:true}).click();
    await page.getByText(/Will set #1/).waitFor();const outcome=page.waitForResponse(r=>r.url().endsWith('/api/outcome'));await page.getByRole('button',{name:'Record outcome',exact:true}).click();assert.equal((await outcome).status(),200);
    assert(readFileSync(join(checkout,'engine','data','applications.md'),'utf8').includes('| Interview |'));
    await page.goto(origin+'/#/start');
    await page.getByRole('checkbox',{name:'Keep my unfinished answers in this browser',exact:true}).check();
    await page.getByRole('radio',{name:/Find similar work/}).check();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByLabel('Your current or most recent role').fill('Fictional draft engineer');
    await page.reload();
    assert.equal(await page.getByLabel('Your current or most recent role').inputValue(),'Fictional draft engineer');
    await page.getByRole('checkbox',{name:'Keep my unfinished answers in this browser',exact:true}).uncheck();
    await page.reload();
    await page.getByRole('button',{name:'Use a fictional example',exact:true}).click();
    await page.getByRole('checkbox',{name:/Save on this computer after each change/}).check();
    await page.getByRole('button',{name:'Compare my directions',exact:true}).click();
    await page.getByText('Saved on this computer after every change.',{exact:true}).waitFor();
    await page.goto(origin+'/#/directions');await page.locator('[data-route-id="return"] button').click();
    await page.getByRole('button',{name:'Mark as done',exact:true}).click();
    await page.getByText(/1 of .* steps done/).first().waitFor();
    await page.getByRole('navigation',{name:'Work on your plan'}).getByRole('link',{name:/Draft a résumé bullet/}).waitFor();
    await page.getByRole('navigation',{name:'Work on your plan'}).getByRole('link',{name:/Review an achievement/}).click();
    await page.getByRole('button',{name:'I have reviewed this',exact:true}).click();
    await page.getByText('Reviewed by you',{exact:true}).waitFor();
    await page.goto(origin+'/#/recovery');
    await page.getByRole('link',{name:'Edit my answers',exact:true}).click();
    await page.getByRole('button',{name:'Change location',exact:true}).click();
    await page.getByLabel('Where you would like to work').fill('Fictional remote location');
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByRole('button',{name:'Save my answers',exact:true}).click();
    await page.getByText(/1 of .* steps done/).first().waitFor();
    await page.goto(origin+'/#/evidence');
    await page.getByText('Reviewed by you',{exact:true}).waitFor();
    const session=await page.evaluate(()=>window.ReboundState.session());
    const sameSession=await context.newPage();await sameSession.goto(origin+'/#/recovery');
    await sameSession.getByText(/1 of .* steps done/).first().waitFor();
    const recoveryUrl=await sameSession.getByRole('link',{name:/Open full recovery/}).getAttribute('href');
    await sameSession.goto(recoveryUrl);await sameSession.getByText('Saved on this computer.',{exact:true}).waitFor();
    assert.equal(await sameSession.locator('.brand-logo').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    assert.equal(JSON.parse(readFileSync(join(dataHome,'reboundops','sessions',session.id+'.json'),'utf8')).session.plan.actions.filter(a=>a.completed).length,1);
    await stopLauncher(child, 'SIGTERM');
    await Promise.all([assertPortReleased(port), assertPortReleased(apiPort)]);
    start();
    // A warm restart must not consume another cold-install allowance.
    await waitForHealth(origin, child, () => log, 120000);
    await page.goto(origin+'/#/recovery');
    await page.getByText(/1 of .* steps done/).first().waitFor();
    await page.goto(origin+'/#/tracker');await page.getByRole('button',{name:'Add application',exact:true}).click();
    await page.getByRole('textbox',{name:'Company',exact:true}).fill('Fictional Manual Studio');
    await page.getByRole('textbox',{name:'Role',exact:true}).fill('Platform Engineer');
    await page.getByRole('button',{name:'Save application',exact:true}).click();await page.getByText('Fictional Manual Studio',{exact:true}).filter({visible:true}).first().waitFor();
    await page.goto(origin+'/#/cv');const previousCv=await page.locator('#cv-editor').inputValue();
    await page.getByRole('button',{name:'Review achievements from recovery',exact:true}).click();
    await page.getByRole('button',{name:'Append reviewed text to editor',exact:true}).click();
    assert((await page.locator('#cv-editor').inputValue()).startsWith(previousCv));
    assert((await page.locator('#cv-editor').inputValue()).includes(session.intake.evidence[0].claim));
    assert.equal((await (await fetch(origin+'/api/cv')).json()).markdown,previousCv,'handoff never auto-saves CV');
    const saveDraft=page.waitForResponse(r=>r.url().endsWith('/api/cv')&&r.request().method()==='PUT');await page.locator('#content button').filter({hasText:/^Save$/}).click();await saveDraft;
    await smokeWorkspaceUsability(page, origin);
    await smokeWorkspaceReadiness(page, origin);
    console.log('PASS: reviewed achievements append to draft without overwriting or auto-saving.');
    console.log('PASS: recovery save, second-tab resume, same-session full interface, persisted restart, manual application entry.');
    console.log('PASS: launcher, real PDF export, truthful failure, tracker status and outcome writes.');
  }finally{
    await browser?.close();
    await stopLauncher(child, 'SIGINT');
    await Promise.all([assertPortReleased(port), assertPortReleased(apiPort)]);
    rmSync(dataHome,{recursive:true,force:true});
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const dir=mkdtempSync(join(tmpdir(),'rebound-fresh-launch-'));
  try{
    const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const checkout=join(dir,'repo');
    execFileSync('git',['clone','--local','--no-hardlinks',root,checkout],{stdio:'inherit'});
    await runLaunchSmoke(checkout);
  }catch(error){console.error(error);process.exitCode=1;}
  finally{rmSync(dir,{recursive:true,force:true});}
}
