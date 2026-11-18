import type { DiscoveredPostingView, JobSourceInfo } from '@reboundops/contracts';

/** Fictional test data for Discover specs. */
export const SOURCES_FIXTURE: JobSourceInfo[] = [
  { id: 'greenhouse', label: 'Greenhouse', supported: true, capabilities: { listBoard: true, singlePosting: true, salary: true, keywordSearch: false }, boardHint: '', docsUrl: '', limitations: ['One company per board.'] },
  { id: 'workday', label: 'Workday', supported: false, capabilities: { listBoard: false, singlePosting: false, salary: false, keywordSearch: false }, boardHint: '', docsUrl: '', limitations: ['No documented public API.'] },
];

const base: DiscoveredPostingView = {
  id: 'd1', source: 'greenhouse', board: 'examplerobotics', postingId: '4001001', title: 'Senior Platform Engineer', employer: 'Example Robotics', employerOrigin: 'provider',
  location: 'Remote - Portugal', locations: [], countries: ['Portugal'], workArrangement: 'remote', workArrangementOrigin: 'location_text',
  postingUrl: 'https://job-boards.greenhouse.io/examplerobotics/jobs/4001001', applyUrl: 'https://job-boards.greenhouse.io/examplerobotics/jobs/4001001',
  description: 'Example.', requirements: [], salary: null, employmentType: null, department: null, postedAt: '2026-10-01T00:00:00.000Z', updatedAt: null,
  retrievedAt: '2026-11-18T10:00:00.000Z', availability: 'listed', lastSeenAt: '2026-11-18T10:00:00.000Z', savedJobId: null,
  fit: { score: 4.5, label: '4.5 / 5' }, eligibility: 'confirmed', duplicates: [], ageHours: 3,
};

export const DISCOVERED_FIXTURE: DiscoveredPostingView[] = [
  base,
  {
    ...base, id: 'd2', postingId: '4001002', title: 'Backend Engineer', employer: 'fictionalpay', employerOrigin: 'board', source: 'greenhouse',
    salary: { min: 55000, max: 70000, currency: 'EUR', interval: null, text: 'EUR 55,000 – 70,000' }, availability: 'not_listed',
    duplicates: [{ jobId: 'j9', title: 'Backend Engineer', reason: 'same employer and title' }], fit: null, eligibility: 'unconfirmed', ageHours: 50,
  },
];
