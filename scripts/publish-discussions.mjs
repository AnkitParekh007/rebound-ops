import { readFile, appendFile } from 'node:fs/promises';

const REPO = 'AnkitParekh007/rebound-ops';
const SOURCE = 'docs/community-discussions-launch.md';
const EXPECTED = ['Announcements', 'General', 'Ideas', 'Q&A', 'Show and tell'];
const normalize = s => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function parseDrafts(markdown) {
  const headings = [...markdown.matchAll(/^## ([1-5])\. (.+)$/gm)];
  if (headings.length !== 5 || headings.some((h, i) => Number(h[1]) !== i + 1)) {
    throw new Error('Expected five numbered discussion drafts in order');
  }
  return headings.map((h, i) => {
    const start = h.index + h[0].length;
    const end = headings[i + 1]?.index ?? markdown.indexOf('## Moderation and launch checklist', start);
    if (end < start) throw new Error('Missing discussion terminator');
    const section = markdown.slice(start, end).trim();
    const category = section.match(/^\*\*Category:\*\*\s*(.+)$/m)?.[1]?.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (category !== EXPECTED[i]) throw new Error('Missing or mismatched category for ' + h[2]);
    const body = section.replace(/^\*\*Category:\*\*.*\r?\n/, '').trim();
    if (body.length < 80) throw new Error('Discussion body is too short: ' + h[2]);
    return { title: h[2].trim(), category, body };
  });
}

async function graphql(query, variables) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'reboundops-discussions-publisher',
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error('GitHub GraphQL returned an error: ' + JSON.stringify(payload.errors ?? payload.message));
  }
  return payload.data;
}

async function report(lines) {
  const message = lines.join('\n') + '\n';
  process.stdout.write(message);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, message);
}

async function run() {
  const publish = process.argv.includes('--publish');
  if (publish && process.env.CONFIRM_DISCUSSIONS_PUBLISH !== 'PUBLISH') {
    throw new Error('To publish, type PUBLISH into the confirmation input.');
  }
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required.');
  if (process.env.GITHUB_REPOSITORY !== REPO) throw new Error('Wrong repository.');
  if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Run on main only.');

  const drafts = parseDrafts(await readFile(SOURCE, 'utf8'));
  const variables = { owner: 'AnkitParekh007', name: 'rebound-ops' };
  const repo = (await graphql(
    'query ($owner:String!, $name:String!) { repository(owner:$owner,name:$name) { id hasDiscussionsEnabled discussionCategories(first:100) { nodes { id name } } } }',
    variables
  )).repository;
  if (!repo?.hasDiscussionsEnabled) throw new Error('Enable GitHub Discussions first.');

  const categories = new Map(repo.discussionCategories.nodes.map(x => [normalize(x.name), x.id]));
  const missing = drafts.filter(d => !categories.has(normalize(d.category)));
  if (missing.length) {
    throw new Error('Create the following Discussion categories before continuing: ' +
      [...new Set(missing.map(d => d.category))].join(', ') +
      '. Existing: ' + repo.discussionCategories.nodes.map(c => c.name).join(', '));
  }

  const existing = new Map();
  let cursor = null;
  do {
    const page = (await graphql(
      'query ($owner:String!, $name:String!, $after:String) { repository(owner:$owner,name:$name) { discussions(first:100,after:$after) { nodes { title url } pageInfo { hasNextPage endCursor } } } }',
      { ...variables, after: cursor }
    )).repository.discussions;
    for (const entry of page.nodes) existing.set(normalize(entry.title), entry.url);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    if (page.pageInfo.hasNextPage && !cursor) throw new Error('Discussion pagination cursor missing.');
  } while (cursor);

  const lines = ['## ReboundOps Discussions ' + (publish ? 'publication' : 'preview'), ''];
  for (const draft of drafts) {
    const previous = existing.get(normalize(draft.title));
    if (previous) {
      lines.push('- Existing: ' + draft.title + ' — ' + previous);
      continue;
    }
    if (!publish) {
      lines.push('- Would publish: ' + draft.title + ' (' + draft.category + ')');
      continue;
    }
    const published = (await graphql(
      'mutation ($input:CreateDiscussionInput!) { createDiscussion(input:$input) { discussion { title url } } }',
      { input: { repositoryId: repo.id, categoryId: categories.get(normalize(draft.category)),
        title: draft.title, body: draft.body } }
    )).createDiscussion?.discussion;
    if (!published?.url) throw new Error('No Discussion URL returned for ' + draft.title);
    existing.set(normalize(draft.title), published.url);
    lines.push('- Published: ' + draft.title + ' — ' + published.url);
    await report(['Published: ' + published.url]);
  }
  lines.push('', publish ? 'Publication complete. Pin the Welcome thread manually if desired.' :
    'Preview only. To publish, rerun with action=publish and confirmation=PUBLISH.');
  await report(lines);
}

if (process.argv[1]?.endsWith('/publish-discussions.mjs')) {
  run().catch(error => {
    console.error('::error::' + error.message);
    process.exitCode = 1;
  });
}
