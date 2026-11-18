/**
 * Builds GitHub Wiki pages from the repository's documentation.
 *
 *   node scripts/community/build-wiki.ts <wiki-checkout-dir> [--update] [--ref <git-ref>]
 *
 * The repository docs stay the source of truth: each generated page carries a marker naming its
 * source file. Safety rules:
 *   - A page that does not exist yet is created.
 *   - A page that exists and carries our marker is replaced only with --update.
 *   - A page that exists without our marker (written by hand on GitHub) is never touched.
 * Relative links are rewritten to wiki pages when the target is also published, and otherwise to the
 * file on GitHub at --ref (default: main). Nothing is committed or pushed; see
 * scripts/community/sync-wiki.sh for the full, approval-gated flow.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface WikiPage {
  page: string;
  source: string;
  title: string;
}

export const REPO_URL = 'https://github.com/AnkitParekh007/rebound-ops';
export const MARKER = '<!-- generated-by: scripts/community/build-wiki.ts';

/** The pages published to the Wiki, in sidebar order. Sources are repository paths. */
export const PAGES: WikiPage[] = [
  { page: 'Home', source: 'docs/community/wiki/Home.md', title: 'Home' },
  { page: 'Installation', source: 'docs/INSTALL.md', title: 'Installation' },
  { page: 'Privacy-and-AI', source: 'docs/community/wiki/Privacy-and-AI.md', title: 'Privacy and AI' },
  { page: 'FAQ', source: 'docs/community/wiki/FAQ.md', title: 'FAQ' },
  { page: 'Architecture', source: 'docs/ARCHITECTURE.md', title: 'Architecture' },
  { page: 'Import-Format', source: 'docs/IMPORT_FORMAT.md', title: 'Import format' },
  { page: 'Moving-From-An-Earlier-Version', source: 'docs/LEGACY_EXPORT_PROCEDURE.md', title: 'Moving from an earlier version' },
  { page: 'Contributing', source: 'CONTRIBUTING.md', title: 'Contributing' },
  { page: 'Roadmap', source: 'ROADMAP.md', title: 'Roadmap' },
  { page: 'Changelog', source: 'CHANGELOG.md', title: 'Changelog' },
];

/** Rewrites relative Markdown links and images in `text`, which comes from repository file `source`. */
export function rewriteLinks(text: string, source: string, ref: string, pages: WikiPage[] = PAGES): string {
  const bySource = new Map(pages.map((p) => [p.source, p.page]));
  return text.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (whole, bang: string, label: string, target: string, titlePart = '') => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) return whole;
    const [pathPart, hash = ''] = target.split('#') as [string, string?];
    if (pathPart === '') return whole;
    const resolved = posix.normalize(posix.join(posix.dirname(source), pathPart));
    if (resolved.startsWith('..')) return whole;
    const anchor = hash ? `#${hash}` : '';
    const page = bySource.get(resolved);
    if (page && !bang) return `[${label}](${page}${anchor})`;
    const url = bang ? `${REPO_URL}/raw/${ref}/${resolved}` : `${REPO_URL}/blob/${ref}/${resolved}${anchor}`;
    return `${bang}[${label}](${url}${titlePart})`;
  });
}

export function renderPage(page: WikiPage, body: string, ref: string, pages: WikiPage[] = PAGES): string {
  const header = `${MARKER} from ${page.source}; edit that file in the repository, not this page -->\n`;
  const note = `> This page is generated from [\`${page.source}\`](${REPO_URL}/blob/${ref}/${page.source}). Edit the source in the repository and the change will be synced here.\n\n`;
  return header + note + rewriteLinks(body, page.source, ref, pages).trimEnd() + '\n';
}

export function renderSidebar(pages: WikiPage[] = PAGES): string {
  return `${MARKER} sidebar -->\n**ReboundOps**\n\n` + pages.map((p) => `- [${p.title}](${p.page})`).join('\n') + `\n\n[Repository](${REPO_URL}) · [Releases](${REPO_URL}/releases)\n`;
}

export type Outcome = 'created' | 'updated' | 'unchanged' | 'skipped-existing' | 'skipped-hand-written';

/** Decides what to do with one page file. Pure, so it can be tested without a file system. */
export function decide(existing: string | null, next: string, update: boolean): Outcome {
  if (existing === null) return 'created';
  if (!existing.startsWith(MARKER)) return 'skipped-hand-written';
  if (existing === next) return 'unchanged';
  return update ? 'updated' : 'skipped-existing';
}

function main(argv: string[]): number {
  const args = [...argv];
  const update = args.includes('--update');
  const refAt = args.indexOf('--ref');
  const ref = refAt >= 0 ? args[refAt + 1] : 'main';
  const outDir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--ref');
  if (!outDir || !ref) {
    console.error('Usage: node scripts/community/build-wiki.ts <wiki-checkout-dir> [--update] [--ref <git-ref>]');
    return 2;
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const out = resolve(outDir);
  if (normalize(out).startsWith(normalize(root) + '/') || out === root) {
    console.error('Refusing to write the wiki inside the repository checkout. Use a separate wiki clone.');
    return 2;
  }
  mkdirSync(out, { recursive: true });
  const files: Array<[string, string]> = PAGES.map((p) => [`${p.page}.md`, renderPage(p, readFileSync(join(root, p.source), 'utf8'), ref)]);
  files.push(['_Sidebar.md', renderSidebar()]);
  let skipped = 0;
  for (const [name, next] of files) {
    const target = join(out, name);
    const existing = existsSync(target) ? readFileSync(target, 'utf8') : null;
    const outcome = decide(existing, next, update);
    if (outcome === 'created' || outcome === 'updated') writeFileSync(target, next);
    if (outcome.startsWith('skipped')) skipped++;
    console.log(`${outcome.padEnd(22)} ${name}`);
  }
  if (skipped) console.log(`\n${skipped} page(s) left untouched. Hand-written pages are never overwritten; generated ones need --update.`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
