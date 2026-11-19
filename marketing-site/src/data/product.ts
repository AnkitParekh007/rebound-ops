/**
 * Product facts used across the site. Every value here must trace to docs/CAPABILITIES.md.
 * Do not add numbers that are not in the repository or the public release notes.
 */

export const REPO_URL = 'https://github.com/AnkitParekh007/rebound-ops';
export const RELEASES_URL = `${REPO_URL}/releases`;

export const CURRENT = {
  version: '0.2.0',
  tag: 'v0.2.0',
  commit: '4e930db',
  date: '2026-11-18',
  channel: 'pre-release',
  releaseUrl: `${REPO_URL}/releases/tag/v0.2.0`,
  assets: [
    { name: 'reboundops-0.2.0.tar.gz', bytes: 428_601, what: 'Source with the prebuilt web app' },
    { name: 'SHA256SUMS', bytes: 273, what: 'Checksums for every file' },
    { name: 'THIRD_PARTY_NOTICES.txt', bytes: 121_575, what: 'Licences of shipped third-party packages' },
    { name: 'reboundops-0.2.0.sbom.json', bytes: 15_310, what: 'Software bill of materials' },
  ],
} as const;

export const assetUrl = (name: string) => `${REPO_URL}/releases/download/${CURRENT.tag}/${name}`;
export const docUrl = (path: string) => `${REPO_URL}/blob/main/${path}`;

export const LICENCE = { id: 'MIT', holder: 'Ankit Parekh', year: 2026 } as const;

export const REQUIREMENTS = [
  { label: 'Node.js', value: '24 or newer', note: 'Uses the built-in node:sqlite module' },
  { label: 'npm', value: '11 or newer', note: 'Bundled with Node 24' },
  { label: 'Disk', value: 'About 100 MB', note: 'Measured 96 MB, mostly the PDF reader, plus your data' },
  { label: 'Memory', value: 'About 105 MB', note: 'Resident, measured on Apple Silicon' },
  { label: 'Network', value: 'Once, to install', note: 'Afterwards only for Discover or a cloud AI provider you enable' },
] as const;

export const PLATFORMS = [
  { name: 'macOS on Apple Silicon', status: 'verified', note: 'Primary target. Fresh install, upgrade from 0.1.0, PDF import and restore verified.' },
  { name: 'Linux (x64)', status: 'ci', note: 'Tested in CI on Ubuntu: unit, API, packaged serving, release verification and browser journey.' },
  { name: 'macOS on Intel', status: 'expected', note: 'Expected to work (no native code); not separately tested.' },
  { name: 'Windows 11', status: 'untested', note: 'Not tested. Node-only, so it may work; file-permission hardening is best effort.' },
] as const;

export const LIMITATIONS = [
  'Pre-release software: version 0.x, expect rough edges.',
  'Windows is untested, and Intel Macs are not separately tested.',
  'PDF import reads selectable text only. There is no OCR, and multi-column layouts may merge lines.',
  'Workable support uses the public feed behind Workable-hosted careers pages, which is not an official API and could change. Workday is not supported.',
  'Cloud AI providers are tested with mocked requests only.',
  'No real data from earlier, non-ReboundOps tools has been migrated yet; the importer is tested on synthetic files.',
  'Pay comparison needs the same currency and a stated period. Hourly pay is never converted.',
] as const;

export const BOARDS = ['Greenhouse', 'Lever', 'Ashby', 'Workable'] as const;

export const AI_TASKS = [
  { id: 'summarize_job', label: 'Summarise a posting' },
  { id: 'missing_skills', label: 'Spot missing skills' },
  { id: 'tailoring', label: 'Suggest tailoring wording' },
  { id: 'screening_answer', label: 'Draft a screening answer' },
  { id: 'cover_letter', label: 'Draft a cover letter' },
  { id: 'interview_prep', label: 'Prepare interview questions' },
  { id: 'follow_up', label: 'Draft a follow-up' },
] as const;

export const STATUSES = [
  { id: 'discovered', label: 'Discovered' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready_for_review', label: 'Ready for review' },
  { id: 'applied', label: 'Applied', note: 'only after you confirm you submitted it' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'withdrawn', label: 'Withdrawn' },
] as const;

export interface Feature {
  id: string;
  area: string;
  title: string;
  body: string;
  points: string[];
  caveat?: string;
}

/** v0.2.0 capabilities only. Source: README feature table and the v0.2.0 release notes. */
export const FEATURES: Feature[] = [
  {
    id: 'onboarding',
    area: 'Start',
    title: 'Onboarding and profile',
    body: 'A short welcome flow you can skip, go back in, or finish later. Your profile holds the facts everything else is built from.',
    points: [
      'Choose AI off or local AI during setup, and set your search goals',
      'Preferences, eligibility facts, contact details and links',
      'Skills, verified experience with highlights, education and certifications',
      'Saved answers you can reuse in screening questions',
    ],
  },
  {
    id: 'resume',
    area: 'Start',
    title: 'Resume import',
    body: 'Bring your master resume in and turn it into editable facts. Nothing is added until you review it, and nothing you already have is overwritten.',
    points: [
      'PDF (selectable text, read on your computer), DOCX, TXT, Markdown or pasted text',
      'Extraction confidence and warnings for every import',
      'Scanned, protected or damaged PDFs are detected: type the text yourself while the original file is kept',
    ],
    caveat: 'No OCR. Multi-column PDFs may merge lines.',
  },
  {
    id: 'discover',
    area: 'Find',
    title: 'Discover',
    body: 'Look up one company’s public job board, only after you allow the request. ReboundOps sends just the board name you type.',
    points: [
      'Greenhouse, Lever, Ashby and Workable public boards',
      'Filters, freshness and availability, fit and eligibility at a glance',
      'Duplicate warnings, save to your tracker, and re-check whether a saved posting is still listed',
      'Polite fetching: HTTPS allow-list, no cookies, one request per second per host, 30-minute cache',
    ],
    caveat: 'Workday is not supported (no documented public API). The Workable feed is unofficial and could change.',
  },
  {
    id: 'intake',
    area: 'Find',
    title: 'Job intake with evidence',
    body: 'Paste a posting and its link. Every extracted detail shows the exact text it came from.',
    points: [
      'Title, employer, location, arrangement, and salary only when the posting states it',
      'Duplicate detection',
      'Postings stay unverified until you confirm them on the official site',
    ],
  },
  {
    id: 'assessment',
    area: 'Evaluate',
    title: 'Explainable fit and eligibility',
    body: 'A 0–5 fit rubric (fit-2026.2) that shows its working, and a separate eligibility status that never mixes “we don’t know yet” with “this rules you out”.',
    points: [
      'Role, required skills, experience (including per-skill years you enter), location, seniority and published pay',
      'Confidence and stated uncertainty for every criterion, with adjustable weights',
      'Required vs preferred qualifications, and what is missing',
      'Eligibility: confirmed, unconfirmed or ineligible',
    ],
  },
  {
    id: 'documents',
    area: 'Prepare',
    title: 'Grounded documents',
    body: 'A tailored resume and cover letter built from facts you have verified, with provenance you can trace line by line.',
    points: [
      'The resume selects and orders your verified highlights; you can edit everything',
      'Missing information stays blank or becomes a [[placeholder]]',
      'ATS-friendly PDF and DOCX; every export is read back to check employers, dates, education and links survived',
    ],
  },
  {
    id: 'preparation',
    area: 'Prepare',
    title: 'Application preparation',
    body: 'Everything you need to apply yourself on the employer’s site.',
    points: [
      'Screening answers drafted only from your saved answers and stated facts; otherwise marked “needs your answer”',
      'A checklist before you apply',
      'The official application link, when it is known',
    ],
  },
  {
    id: 'tracking',
    area: 'Track',
    title: 'Tracker and follow-ups',
    body: 'A status workflow with a complete activity trail. Applied is only ever set by you.',
    points: [
      'Original submission date kept; closed applications reopen with their history',
      'Notes, contacts and reminders, with 30-day undo for deletions; priorities and snooze',
      'Interview notes and preparation',
      'Follow-up drafts and your own templates: copy them, or open them in your own mail app',
      'CSV export',
    ],
  },
  {
    id: 'overview',
    area: 'Track',
    title: 'Overview',
    body: 'Your pipeline and next actions, from your own records only.',
    points: ['Pipeline and next actions', 'Ranked follow-ups to consider, and reminders', 'Response rate and median days to response, derived from your data'],
  },
  {
    id: 'data',
    area: 'Own',
    title: 'Backups, restore and import',
    body: 'One local SQLite file you control, with tools to protect and move it.',
    points: [
      'Complete backup, optionally password-protected (scrypt and AES-256-GCM)',
      'Restore in the app with a typed confirmation and a recovery copy, or from the command line',
      'Crash-safe, journalled restore and a data-folder lock',
      'Readable JSON and CSV exports',
      'Staged, previewed import of exports and of a documented neutral format',
    ],
  },
  {
    id: 'ai',
    area: 'Own',
    title: 'Optional AI',
    body: 'Off by default, and every feature works without it. Turn on a local Ollama model you already have, or opt in to a cloud provider.',
    points: [
      'Seven grounded assist tasks: summaries, missing skills, tailoring wording, screening answers, cover letters, interview preparation and follow-ups',
      'Suggestions are checked against your records and withheld if they add facts',
      'Nothing is saved automatically',
      'Cloud providers (Anthropic, OpenAI, Gemini, OpenRouter) need your consent; keys are read from environment variables and never stored',
    ],
    caveat: 'Cloud providers are tested with mocked requests only.',
  },
];

export interface Release {
  version: string;
  tag: string;
  commit: string;
  date: string;
  channel: string;
  url: string;
  summary: string;
  sections: { title: string; items: string[] }[];
}

/** Real releases only, from the public GitHub release notes. */
export const RELEASES: Release[] = [
  {
    version: '0.2.0',
    tag: 'v0.2.0',
    commit: '4e930db',
    date: '2026-11-18',
    channel: 'Pre-release',
    url: `${REPO_URL}/releases/tag/v0.2.0`,
    summary: 'PDF import, Discover, a new fit rubric, protected backups and in-app restore, deeper tracking, and optional local AI assistance.',
    sections: [
      {
        title: 'New',
        items: [
          'PDF resume import, read locally (selectable text only, no OCR). Scanned, protected or damaged PDFs are detected, and you can type the text while the original file is kept. Every fact is reviewed before it is added.',
          'Discover: look up one company’s public job board on Greenhouse, Lever, Ashby or Workable after you consent to the request. Workday is not supported because it has no documented public API.',
          'Fit rubric fit-2026.2, with per-skill years, seniority and published pay. Missing information is still kept separate from real disqualifiers.',
          'Password-protected backups (scrypt and AES-256-GCM), in-app restore with typed confirmation and a recovery copy, crash-safe journalled restore with a disk-space check, and a data-folder lock.',
          'Tracking: closed applications reopen with their history kept, the original submission date is kept, 30-day undo for deleted contacts and reminders, follow-up ranking, your own templates, interview notes and CSV export.',
          'Optional local AI (Ollama): seven grounded assist tasks that withhold any output adding facts not in your records.',
          'The import format now carries contacts and reminders.',
        ],
      },
      {
        title: 'Upgrading from 0.1.0',
        items: [
          'The database migrates in place from schema 3 to 4. The migration only adds columns and tables.',
          'Backups from 0.1.0 restore in 0.2.0.',
          'Fit scores can change, because assessments are recomputed with the new rubric.',
        ],
      },
      {
        title: 'Known limitations',
        items: [
          'Cloud AI providers are tested with mocked requests only.',
          'PDF import has no OCR, and multi-column layouts may merge lines.',
          'The Workable integration uses the public feed behind Workable-hosted careers pages, which could change.',
          'Windows is untested.',
          'No automatic migration from earlier, non-ReboundOps tools is included yet.',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    tag: 'v0.1.0',
    commit: 'd47d3a3',
    date: '2026-11-18',
    channel: 'Pre-release',
    url: `${REPO_URL}/releases/tag/v0.1.0`,
    summary: 'The first pre-release: the complete local journey from onboarding to follow-up, with or without AI.',
    sections: [
      {
        title: 'What it does',
        items: [
          'Onboarding and profile: goals, roles, countries, remote and relocation preferences, skills, verified experience and reusable answers.',
          'Resume import: your resume becomes editable facts and the original file is kept. Imported facts stay unverified until you confirm them.',
          'Job intake: details are extracted only where the text supports them, and a posting nobody has checked live is labelled unverified. Duplicate checks explain their reasons.',
          'Screening: an explainable 0–5 fit score plus a separate eligibility status.',
          'Tailoring and documents: editable resume and cover-letter drafts built only from your facts, with ATS-friendly PDF and DOCX export.',
          'Application prep: screening-answer drafts for you to review, and a link to the official application page when it is known.',
          'Tracking from Discovered to Offer. Applied is only ever set by you, and every change is kept in an activity trail.',
          'Follow-ups: contacts, reminders and drafts. Nothing is sent automatically.',
          'Dashboard, local SQLite with migrations, JSON export, backup and command-line restore, and import of files from an earlier version.',
          'Optional AI: local Ollama, or an opt-in cloud provider that needs consent on every request.',
        ],
      },
      {
        title: 'Known limitations at the time',
        items: [
          'Cloud AI providers tested only with mocks.',
          'No real data from an earlier version migrated; the importer is tested on synthetic data.',
          'Backups were not encrypted and restore was command-line only (both addressed in 0.2.0).',
        ],
      },
    ],
  },
];

export interface Faq {
  q: string;
  a: string;
  home?: boolean;
}

export const FAQS: Faq[] = [
  {
    q: 'Does ReboundOps apply to jobs for me?',
    a: 'No. It never submits applications or sends messages. It prepares documents, answers and a checklist, links to the official application page, and you apply yourself. A job is marked Applied only after you confirm you submitted it.',
    home: true,
  },
  {
    q: 'Do I need AI to use it?',
    a: 'No. AI is off by default and every feature works without it. If you want help with wording, you can enable a local Ollama model you already have, or opt in to a cloud provider with your own key.',
    home: true,
  },
  {
    q: 'Where is my data stored?',
    a: 'In one SQLite database in a private folder on your computer (~/.reboundops by default). There is no account and no ReboundOps server. You can back it up, password-protect the backup, export it as JSON or CSV, and restore it.',
    home: true,
  },
  {
    q: 'When does ReboundOps use the network?',
    a: 'Once, to install its runtime libraries. After that, only when you use Discover (it contacts the job board you name, after you allow it) or a cloud AI provider you have enabled and consented to.',
    home: true,
  },
  {
    q: 'Is there a Mac app or Windows installer?',
    a: 'No. Version 0.2.0 is a Node.js package: you download a source archive with a prebuilt web app, install its libraries with npm, and open it in your browser at 127.0.0.1. There is no desktop wrapper and no native installer.',
    home: true,
  },
  {
    q: 'Which operating systems are supported?',
    a: 'macOS on Apple Silicon is the primary, verified target, and Linux (x64) is tested in CI. Intel Macs are expected to work but are not separately tested, and Windows has not been tested.',
  },
  {
    q: 'How is the fit score calculated?',
    a: 'With an explainable 0–5 rubric (fit-2026.2) covering role, required skills, experience, location, seniority and published pay. Each criterion shows its evidence, confidence and uncertainty, and you can adjust the weights. Eligibility is a separate status: confirmed, unconfirmed or ineligible.',
  },
  {
    q: 'Can it invent experience to match a job?',
    a: 'It is designed not to. Drafts use only facts you marked verified; missing information stays blank or becomes a [[placeholder]]. AI suggestions that add facts not in your records are withheld.',
  },
  {
    q: 'Which job boards does Discover support?',
    a: 'Public boards on Greenhouse, Lever and Ashby, and the public feed behind Workable-hosted careers pages (unofficial, and it could change). Workday is not supported because it has no documented public API. Discover looks up one company at a time.',
  },
  {
    q: 'Can it read scanned PDFs?',
    a: 'No. PDF import reads selectable text only and there is no OCR. Scanned, protected or damaged PDFs are detected, and you can type or paste the text while the original file is kept.',
  },
  {
    q: 'Is it open source?',
    a: 'Yes. The source is on GitHub under the MIT licence. Third-party packages keep their own licences, which ship with each release in THIRD_PARTY_NOTICES.txt.',
  },
  {
    q: 'Can I bring data from another tool?',
    a: 'You can import files in a documented neutral format, with a preview before anything is written. No automatic migration from other tools exists yet, and no real legacy data has been migrated.',
  },
  {
    q: 'Is it free?',
    a: 'Yes. ReboundOps is free and open source. It needs no account or paid service. A cloud AI provider, if you choose to enable one, is billed by that provider under your own key.',
  },
];
