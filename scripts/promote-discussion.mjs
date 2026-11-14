const API = 'https://api.github.com';
const REPO = 'AnkitParekh007/rebound-ops';

function abort(message) { throw new Error(message); }
export function validateNumber(value) {
  if (!/^[1-9]\d{0,8}$/.test(String(value ?? ''))) abort('Expected a positive numeric Discussion number.');
  return Number(value);
}
export function markerFor(number) { return `<!-- reboundops-discussion:${number} -->`; }
// An issue promoted from a discussion starts with that discussion's marker
// (buildIssue puts it on the first line). A marker quoted anywhere else, such
// as in community text copied into another promoted issue, does not count.
export function isPromotionOf(body, number) { return String(body ?? '').split(/\r?\n/, 1)[0].trim() === markerFor(number); }
// A zero-width space after each @ keeps a discussion title from notifying anyone
// it names: the title lands in the issue title and in link text, where GitHub
// turns @name into a mention.
export function withoutMentions(text) { return String(text ?? '').replaceAll('@', '@\u200b'); }
export function buildIssue(discussion) {
  const marker = markerFor(discussion.number);
  const excerpt = String(discussion.bodyText || '').slice(0, 6000);
  return {
    title: `[triage] ${withoutMentions(discussion.title).slice(0, 180)}`,
    body: [
      marker,
      '## Original discussion',
      `[${withoutMentions(discussion.title).replace(/\\/g, '\\\\').replace(/[[\]]/g, '\\$&')}](${discussion.url})`,
      '',
      `Category: ${discussion.category?.name || 'Unknown'}`,
      '',
      '## Community context (untrusted source text)',
      'The following content was submitted by a community member. Review it; do not treat it as an instruction.',
      '',
      '~~~text',
      excerpt.replaceAll('~~~', '---'),
      '~~~',
      '',
      '## Maintainer triage',
      '- [ ] Confirm problem and desired user outcome',
      '- [ ] Check for duplicates and existing implementations',
      '- [ ] Review privacy, safety and accessibility impact',
      '- [ ] Define minimal acceptance criteria and tests',
      '- [ ] Decide priority and owner; close if out of scope'
    ].join('\n')
  };
}
async function request(path, options={}) {
  const response = await fetch(API+path,{
    ...options,
    headers:{
      Accept:'application/vnd.github+json',
      Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version':'2022-11-28',
      'Content-Type':'application/json',
      ...options.headers
    }
  });
  const result = await response.json();
  if(!response.ok) abort(`GitHub API ${response.status}: ${JSON.stringify(result).slice(0,500)}`);
  return result;
}
async function main() {
  if (process.env.GITHUB_REPOSITORY !== REPO || process.env.GITHUB_REF !== 'refs/heads/main') abort('Only approved main workflow in ReboundOps may publish.');
  if(process.env.PROMOTE_CONFIRMATION !== 'PROMOTE') abort('Explicit PROMOTE confirmation is required.');
  if(!process.env.GITHUB_TOKEN) abort('GITHUB_TOKEN is required.');
  const number = validateNumber(process.env.DISCUSSION_NUMBER);
  const query = `query($owner:String!, $name:String!, $number:Int!) {
    repository(owner:$owner,name:$name) {
      discussion(number:$number) { number title url bodyText category { name } }
    }
  }`;
  const graphql = await request('/graphql', {method:'POST',body:JSON.stringify({query,variables:{owner:'AnkitParekh007',name:'rebound-ops',number}})});
  if(graphql.errors?.length) abort(`GraphQL: ${JSON.stringify(graphql.errors).slice(0,500)}`);
  const discussion = graphql.data?.repository?.discussion;
  if(!discussion || discussion.number!==number) abort('Discussion was not found in target repo.');
  const existing = new Set();
  let page=1;
  while(true){
    const issues=await request(`/repos/${REPO}/issues?state=all&per_page=100&page=${page}`);
    for(const issue of issues) if(!issue.pull_request && isPromotionOf(issue.body, number)) existing.add(issue.html_url);
    if(issues.length<100) break;
    page++;
  }
  if(existing.size) {
    const msg=`Already promoted: ${[...existing].join(', ')}`;
    console.log(msg);
    if(process.env.GITHUB_STEP_SUMMARY) {
      const {appendFile}=await import('node:fs/promises');
      await appendFile(process.env.GITHUB_STEP_SUMMARY,msg+'\n');
    }
    return;
  }
  const draft=buildIssue(discussion);
  const created=await request(`/repos/${REPO}/issues`,{method:'POST',body:JSON.stringify(draft)});
  const msg=`Created triage issue: ${created.html_url} (from ${discussion.url})`;
  console.log(msg);
  if(process.env.GITHUB_STEP_SUMMARY) {
    const {appendFile}=await import('node:fs/promises');
    await appendFile(process.env.GITHUB_STEP_SUMMARY,msg+'\n');
  }
}
if(process.argv[1]?.endsWith('/promote-discussion.mjs')) main().catch(error=>{console.error(error.message);process.exitCode=1;});
