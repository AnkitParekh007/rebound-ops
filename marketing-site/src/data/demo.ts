/**
 * Synthetic example data for the interactive demos. Every person, employer and posting is fictional.
 * Scores are illustrative: they show how ReboundOps explains a result, not output of the real rubric.
 */

export type Eligibility = 'confirmed' | 'unconfirmed' | 'ineligible';

export interface Criterion {
  name: string;
  score: number | null;
  weight: number;
  posting: string;
  profile: string;
  note: string;
}

export interface DemoJob {
  id: string;
  title: string;
  employer: string;
  location: string;
  pay: string;
  source: string;
  fit: number;
  confidence: 'high' | 'medium' | 'low';
  eligibility: Eligibility;
  eligibilityReason: string;
  criteria: Criterion[];
  missing: string[];
}

export const CANDIDATE = {
  name: 'Sam Rivera',
  headline: 'Platform engineer, 6 years',
  location: 'Lisbon, Portugal',
  authorised: 'Portugal (EU)',
  sponsorship: 'Needs sponsorship outside the EU',
};

export const DEMO_JOBS: DemoJob[] = [
  {
    id: 'northwind',
    title: 'Platform Engineer',
    employer: 'Northwind Labs',
    location: 'Lisbon · hybrid',
    pay: '€62,000–€75,000 a year (stated)',
    source: 'Pasted description · unverified',
    fit: 4.2,
    confidence: 'high',
    eligibility: 'confirmed',
    eligibilityReason: 'Role is in Portugal, where your profile says you are authorised to work.',
    criteria: [
      { name: 'Role', score: 5, weight: 1, posting: '“Platform Engineer to own our internal developer platform”', profile: 'Target role: Platform Engineer', note: 'Exact match with a target role.' },
      { name: 'Required skills', score: 4, weight: 2, posting: '“Kubernetes, Terraform and Go required”', profile: 'Verified: Kubernetes, Terraform. Go: not in your profile', note: '2 of 3 required skills verified.' },
      { name: 'Experience', score: 4, weight: 1.5, posting: '“5+ years in infrastructure”', profile: '6 years (2 verified roles)', note: 'Meets the stated minimum.' },
      { name: 'Location', score: 5, weight: 1, posting: '“Lisbon office, 2 days a week”', profile: 'Prefers Lisbon; hybrid or remote', note: 'Matches your preference.' },
      { name: 'Seniority', score: 4, weight: 0.5, posting: '“Mid to senior level”', profile: 'Most recent title: Senior Engineer', note: 'Within range.' },
      { name: 'Published pay', score: 3, weight: 0.5, posting: '“€62,000–€75,000”', profile: 'Your minimum: €65,000 a year', note: 'Lower end is below your minimum.' },
    ],
    missing: ['Go (required) is not in your profile — add it if you have verified experience, or leave it missing.'],
  },
  {
    id: 'harbor',
    title: 'Senior Data Engineer',
    employer: 'Harbor & Pine',
    location: 'Remote · Germany',
    pay: 'Not stated',
    source: 'Discover · Greenhouse board · listed 2 days ago',
    fit: 3.1,
    confidence: 'medium',
    eligibility: 'unconfirmed',
    eligibilityReason: 'The posting asks for the right to work in Germany. Your profile does not say yet — this is missing information, not a disqualifier.',
    criteria: [
      { name: 'Role', score: 3, weight: 1, posting: '“Senior Data Engineer”', profile: 'Target roles: Platform Engineer, SRE', note: 'Adjacent to your target roles.' },
      { name: 'Required skills', score: 3, weight: 2, posting: '“Python, Airflow, SQL”', profile: 'Verified: Python, SQL. Airflow: not in your profile', note: '2 of 3 required skills verified.' },
      { name: 'Experience', score: 4, weight: 1.5, posting: '“4+ years with data pipelines”', profile: 'Pipelines in 1 verified role (3 years)', note: 'Close to the stated minimum.' },
      { name: 'Location', score: 4, weight: 1, posting: '“Remote within Germany”', profile: 'Open to remote', note: 'Remote matches; country needs your answer.' },
      { name: 'Seniority', score: 3, weight: 0.5, posting: '“Senior”', profile: 'Most recent title: Senior Engineer', note: 'Same level, different discipline.' },
      { name: 'Published pay', score: null, weight: 0.5, posting: 'No pay in the posting', profile: '—', note: 'Not scored: nothing to compare.' },
    ],
    missing: ['Airflow (required) is not in your profile.', 'Right to work in Germany: add it to your profile to confirm eligibility.'],
  },
  {
    id: 'quarry',
    title: 'Site Reliability Lead',
    employer: 'Quarry Analytics',
    location: 'Austin, TX · on-site',
    pay: '$150,000–$180,000 a year (stated)',
    source: 'Pasted description · unverified',
    fit: 2.4,
    confidence: 'medium',
    eligibility: 'ineligible',
    eligibilityReason: 'The posting says “no visa sponsorship” and your profile says you need sponsorship in the US. This is a stated disqualifier.',
    criteria: [
      { name: 'Role', score: 4, weight: 1, posting: '“Site Reliability Lead”', profile: 'Target roles: Platform Engineer, SRE', note: 'Close to a target role.' },
      { name: 'Required skills', score: 3, weight: 2, posting: '“Kubernetes, Prometheus, on-call leadership”', profile: 'Verified: Kubernetes, Prometheus', note: 'Leadership not verified.' },
      { name: 'Experience', score: 2, weight: 1.5, posting: '“8+ years, 2 leading a team”', profile: '6 years; no lead role recorded', note: 'Below the stated minimum.' },
      { name: 'Location', score: 1, weight: 1, posting: '“On-site in Austin”', profile: 'Prefers Portugal; not open to relocation', note: 'Conflicts with your preferences.' },
      { name: 'Seniority', score: 2, weight: 0.5, posting: '“Lead”', profile: 'Most recent title: Senior Engineer', note: 'One level above.' },
      { name: 'Published pay', score: 3, weight: 0.5, posting: '“$150,000–$180,000”', profile: 'Your minimum is in EUR', note: 'Different currency: compared with low confidence.' },
    ],
    missing: ['8+ years of experience (you have 6).', 'Team-lead experience is not in your profile.'],
  },
];

export const ELIGIBILITY_COPY: Record<Eligibility, { label: string; tone: string }> = {
  confirmed: { label: 'Eligibility confirmed', tone: 'ok' },
  unconfirmed: { label: 'Eligibility unconfirmed', tone: 'warn' },
  ineligible: { label: 'Ineligible', tone: 'bad' },
};

/** Resume / cover letter preview with provenance for each line. */
export const DOC_PREVIEW = {
  resume: [
    { kind: 'h', text: 'Sam Rivera', from: 'Profile · name' },
    { kind: 'meta', text: 'Lisbon, Portugal · sam.rivera@example.test · linkedin.com/in/sam-rivera-example', from: 'Profile · contact and links' },
    { kind: 'sh', text: 'Experience', from: null },
    { kind: 'role', text: 'Senior Engineer — Tidewater Systems (fictional) · Mar 2022 – Present', from: 'Verified experience #1' },
    { kind: 'li', text: 'Built a self-service Kubernetes platform used by 14 product teams.', from: 'Verified highlight · chosen for “internal developer platform”' },
    { kind: 'li', text: 'Moved 120 services to Terraform-managed infrastructure.', from: 'Verified highlight · chosen for “Terraform required”' },
    { kind: 'role', text: 'Infrastructure Engineer — Larkspur Cloud (fictional) · Jan 2019 – Feb 2022', from: 'Verified experience #2' },
    { kind: 'li', text: 'Ran the on-call rotation for the payments platform.', from: 'Verified highlight' },
    { kind: 'sh', text: 'Education', from: null },
    { kind: 'role', text: 'BSc Computer Science — University of Coimbra (fictional entry) · 2018', from: 'Verified education' },
  ],
  letter: [
    { kind: 'meta', text: 'To the hiring team at Northwind Labs', from: 'Posting · employer' },
    { kind: 'p', text: 'I’m applying for the Platform Engineer role. Your focus on an internal developer platform matches the work I have done for the last four years.', from: 'Posting · title and summary + verified experience #1' },
    { kind: 'p', text: 'At Tidewater Systems I built a self-service Kubernetes platform used by 14 product teams, and moved 120 services to Terraform.', from: 'Verified highlights only' },
    { kind: 'p', text: 'I have not worked with Go professionally. [[Add a sentence about Go only if it is true]]', from: 'Missing qualification → placeholder, not invented' },
    { kind: 'p', text: 'Thank you for considering my application.', from: 'Template' },
  ],
} as const;

/** What leaves the computer, by action. Source: README principles and the release-readiness report. */
export const NETWORK_ACTIONS = [
  { id: 'open', label: 'Open the app', local: true, detail: 'The API listens on 127.0.0.1 only and serves the web app itself. No fonts, scripts or analytics are loaded from elsewhere.' },
  { id: 'import', label: 'Import a resume PDF', local: true, detail: 'The PDF is read by pdf.js inside the local service. The original file is stored in your data folder.' },
  { id: 'assess', label: 'Assess fit', local: true, detail: 'The rubric runs locally against your saved profile and the posting text.' },
  { id: 'export', label: 'Export PDF or DOCX', local: true, detail: 'Documents are generated and checked on your computer.' },
  { id: 'backup', label: 'Back up your data', local: true, detail: 'The backup file is created locally and downloaded by your browser. Optional password encryption (scrypt + AES-256-GCM).' },
  { id: 'ollama', label: 'Use local AI (Ollama)', local: true, detail: 'Requests go to Ollama on your own machine. Only the profile entries a task needs are included.' },
  { id: 'discover', label: 'Discover a job board', local: false, consent: 'You allow it before any look-up', to: 'The job board you name (Greenhouse, Lever, Ashby or Workable)', sends: 'Only the board name you type. No cookies, no profile data.', detail: 'HTTPS allow-list, 15-second timeout, 25 MB cap, at most one request per second per host, and a 30-minute cache.' },
  { id: 'cloud', label: 'Use a cloud AI provider', local: false, consent: 'Asked on every request', to: 'The provider you enabled (Anthropic, OpenAI, Gemini or OpenRouter)', sends: 'The selected text and only the verified profile entries that task needs.', detail: 'Your API key is read from an environment variable and is never stored or shown.' },
] as const;
