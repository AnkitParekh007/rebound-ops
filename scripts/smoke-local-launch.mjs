/** Real first-use regression: isolated checkout, advertised launcher, browser UI. */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
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
export async function runLaunchSmoke(checkout) {
  const port=await freePort(), apiPort=await freePort();
  const env={...process.env,PORT:String(port),REBOUNDOPS_API_PORT:String(apiPort),REBOUND_OPS_ROOT:join(checkout,'engine'),REBOUNDOPS_AI_ENABLED:'false'};
  for(const key of Object.keys(env))if(/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/.test(key))delete env[key];
  delete env.REBOUNDOPS_DATA_DIR;delete env.REBOUNDOPS_AI_COUNTER_FILE;
  const child=spawn('bash',['scripts/start-demo.sh'],{cwd:checkout,env,stdio:['ignore','pipe','pipe']});
  let log='',browser;child.stdout.on('data',d=>{log=(log+d).slice(-20000);process.stdout.write(d);});child.stderr.on('data',d=>{log=(log+d).slice(-20000);process.stderr.write(d);});
  const origin=`http://127.0.0.1:${port}`;
  try {
    const deadline=Date.now()+240000;
    while(true){
      if(child.exitCode!==null)throw Error('Launcher exited before readiness: '+log);
      try {const r=await fetch(origin+'/api/rebound/health');if(r.ok)break;}catch{}
      assert(Date.now()<deadline,'Launcher readiness timeout: '+log);
      await new Promise(r=>setTimeout(r,250));
    }
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
    await page.goto(origin+'/#/tracker');await page.getByRole('button',{name:'More actions',exact:true}).click();
    const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('menuitem',{name:'Import CSV',exact:true}).click();
    await (await chooserPromise).setFiles({name:'fictional-startup.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Company,Role,Status,Notes\n2026-11-09,Fictional Startup Studio,Backend Engineer,Applied,Fictional regression record\n')});
    await page.getByRole('button',{name:'Import rows (1)',exact:true}).click();
    const status=page.getByRole('combobox',{name:'Change application status',exact:true}).first();
    const statusResponse=page.waitForResponse(r=>r.url().endsWith('/api/tracker/status'));await status.selectOption('Responded');assert.equal((await statusResponse).status(),200);
    await page.getByRole('button',{name:'Record outcome — Fictional Startup Studio',exact:true}).click();await page.getByRole('combobox',{name:'Record outcome',exact:true}).selectOption('interview_progress');await page.getByRole('textbox',{name:'Note (optional)',exact:true}).fill('Fictional note');await page.getByRole('button',{name:'Preview',exact:true}).click();
    await page.getByText(/Will set #1/).waitFor();const outcome=page.waitForResponse(r=>r.url().endsWith('/api/outcome'));await page.getByRole('button',{name:'Record outcome',exact:true}).click();assert.equal((await outcome).status(),200);
    assert(readFileSync(join(checkout,'engine','data','applications.md'),'utf8').includes('| Interview |'));
    console.log('PASS: launcher, real PDF export, truthful failure, tracker status and outcome writes.');
  }finally{
    await browser?.close();
    const stopped=new Promise(r=>child.once('exit',r));if(child.exitCode===null){child.kill('SIGTERM');await stopped;}
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
