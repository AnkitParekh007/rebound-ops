/** Browser regressions for R1–R6. Synthetic career data; network scans are stubbed. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
export async function smokeWorkspaceReadiness(page, origin, name = 'Fictional startup test') {
  const goto=async route=>{await page.goto(origin+'/#/'+route,{waitUntil:'networkidle'});};
  await goto('portals');
  await page.getByRole('textbox',{name:'Discover ATS board',exact:true}).fill('Fictional Readiness Board');
  await page.getByText('Already know the board URL?',{exact:true}).click();
  await page.getByLabel('Known ATS board URL',{exact:true}).fill('https://job-boards.greenhouse.io/fictional-readiness-board');
  await page.getByRole('button',{name:'Add known board URL',exact:true}).click();
  await page.getByText('Source added. Run a scan or health check to verify availability.',{exact:true}).waitFor();
  let result='failed';let requested;let empty=false;
  const jobs=[
    {title:'Backend Engineer',company:'Fictional Board',location:'India',source:'greenhouse',url:'https://example.org/jobs/remote',workplaceType:'Remote',isRemote:true,workplaceEvidence:'Employer description: All of our roles are remote'},
    {title:'Platform Engineer',company:'Fictional Board',location:'India',source:'greenhouse',url:'https://example.org/jobs/unknown',workplaceType:'Unknown',isRemote:false,workplaceEvidence:'Work model not specified by the source.'}
  ];
  await page.route('**/api/scan-results**',route=>route.fulfill({json:{en:{when:new Date().toISOString(),fresh:empty?[]:jobs,filtered:empty?[]:jobs,errors:[]},ru:null}}));
  await page.route('**/api/stream/scan?**',route=>{
    requested=new URL(route.request().url());
    const data={status:result,code:result==='failed'?1:0,errors:result==='success'?0:1,retainedPrevious:result==='failed',counts:{raw:result==='failed'?0:48,matching:empty?0:2,fresh:result==='failed'||empty?0:2},final:true};
    return route.fulfill({contentType:'text/event-stream',body:'event: start\ndata: {"script":"en-scanner"}\n\nevent: done\ndata: '+JSON.stringify(data)+'\n\n'});
  });
  await goto('scan?q=Platform%20Engineer');
  async function scan() {
    await page.getByRole('button',{name:/🌐.*Scan/}).click();await page.getByLabel('Actual scan query',{exact:true}).fill('Engineer');
    await page.getByLabel('Locations for this scan',{exact:true}).fill('India');
    await page.getByRole('button',{name:'Confirm and scan',exact:true}).click();
  }
  await scan();await page.getByText(/Scan failed: no selected source/).first().waitFor();
  assert.equal(requested.searchParams.get('queryText'),'Engineer');assert.equal(requested.searchParams.get('location'),'India');
  assert.equal(new URLSearchParams(page.url().split('?')[1]).get('q'),'Engineer');
  result='partial';await scan();await page.getByText(/Partial scan: some sources failed/).first().waitFor();
  result='success';await scan();await page.getByText(/Scan complete · 48 fetched · 2 matched/).first().waitFor();
  await page.getByRole('link',{name:'Backend Engineer',exact:true}).waitFor();
  await page.getByRole('button',{name:/Work type/}).click();await page.locator('#scan-filter-remote').selectOption('onsite');await page.keyboard.press('Escape');
  await page.getByText('No matches',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Show this scan’s results',exact:true}).click();await page.getByRole('link',{name:'Backend Engineer',exact:true}).waitFor();
  empty=true;await scan();await page.getByText(/Scan complete · 48 fetched · 0 matched/).first().waitFor();
  await page.getByText('No matches in the saved scan for this source scope',{exact:true}).waitFor();
  assert.equal(await page.getByText(/This does not mean there are no opportunities/).count(),1);
  await page.getByRole('button',{name:'Review query and locations',exact:true}).click();
  await page.getByRole('heading',{name:'Review scan inputs',exact:true}).waitFor();
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.unroute('**/api/stream/scan?**');await page.unroute('**/api/scan-results**');
  await goto('config?tab=profile');await page.locator('#pf-candidate-full_name').fill(name);
  const profile=page.waitForResponse(r=>r.url().endsWith('/api/profile')&&r.request().method()==='PUT');await page.getByRole('button',{name:'💾 Save',exact:true}).click();assert.equal((await profile).status(),200);
  await goto('cv-studio');await page.getByRole('checkbox',{name:'Name → initials',exact:true}).check();
  assert.equal(await page.getByRole('button',{name:'Copy masked CV',exact:true}).isDisabled(),true);
  assert.equal(await page.getByLabel('Generated result — read only',{exact:true}).inputValue(),'');
  await page.getByRole('button',{name:'Use my saved profile name',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Copy masked CV'&&!button.disabled));
  assert.equal(await page.getByRole('button',{name:'Copy masked CV',exact:true}).isEnabled(),true);
  assert(!((await page.getByLabel('Generated result — read only',{exact:true}).inputValue()).includes(name)));
  await goto('evaluate');await page.locator('#eval-jd').fill('Fictional platform engineering opening requiring Node.js, deployment pipelines and Terraform. No real employer or application.');
  await page.locator('#content button.btn-primary').first().click();await page.getByRole('textbox',{name:'Prompt to review before sharing',exact:true}).waitFor();
  await page.getByText('Bring a web-chat answer back',{exact:true}).click();
  await page.getByRole('textbox',{name:'Review name',exact:true}).fill('Fictional reviewed vacancy');
  await page.getByRole('textbox',{name:'Reviewed web-chat answer',exact:true}).fill('A fictional manually reviewed answer. Terraform production ownership remains unproven.');
  await page.getByRole('checkbox',{name:'I reviewed this answer and want to keep it locally',exact:true}).check();
  const report=page.waitForResponse(r=>r.url().endsWith('/api/reports')&&r.request().method()==='POST');await page.getByRole('button',{name:'Save reviewed answer locally',exact:true}).click();assert.equal((await report).status(),200);await page.getByRole('link',{name:'Open saved review',exact:true}).waitFor();
  await goto('recovery');await page.getByText('Make a step specific to your evidence gap',{exact:true}).click();
  await page.getByLabel('Your concrete experiment',{exact:true}).fill('Build a small Terraform sandbox and record what remains unproven.');
  await page.getByRole('button',{name:'Save experiment',exact:true}).click();await page.getByRole('heading',{name:'Build a small Terraform sandbox and record what remains unproven.',exact:true}).waitFor();
  const backup=page.waitForEvent('download');await page.getByRole('button',{name:'Download combined career backup',exact:true}).click();await page.getByRole('button',{name:'Download private backup',exact:true}).click();
  const download=await backup, file=await download.path(), data=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(data.format,'reboundops-combined-backup');assert(data.recovery.plan.actions.some(action=>action.title.includes('Terraform sandbox')));assert(data.workspace['cv.md'].includes(name));assert(!data.workspace['config/config.yml']);
  await page.getByLabel('Restore a recovery or combined JSON backup (recovery starts in memory only)',{exact:true}).setInputFiles(file);
  await page.getByRole('heading',{name:'Review combined backup restore',exact:true}).waitFor();
  const cv=page.getByRole('checkbox',{name:/^cv\.md — replace existing file$/});assert.equal(await cv.isChecked(),false);await cv.check();
  await page.getByRole('button',{name:'Restore selected records',exact:true}).click();
  await page.getByText(/Memory only: recovery work ends/).first().waitFor();
  console.log('PASS: scan failures/partial/success/zero matches, query alignment, source setup, guarded masking, reviewed answers, experiments and combined backup restore.');
}
