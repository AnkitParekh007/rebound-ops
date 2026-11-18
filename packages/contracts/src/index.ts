/**
 * Shared, versioned contracts between the ReboundOps API and its clients.
 *
 * Every payload that crosses the API boundary is described here as a zod schema.
 * The web client imports these as types only (`import type`), so zod never
 * ships to the browser; the API uses the schemas for runtime validation.
 */
import { z } from 'zod';

export const CONTRACTS_VERSION = 1 as const;

const shortText = (max = 200) => z.string().trim().max(max);
const isoDate = z.iso.datetime({ offset: true });
const tag = shortText(80).min(1);

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

/** How AI assistance is used. `off` means the full product works without any model. */
export const AiMode = z.enum(['off', 'local', 'cloud']);
export type AiMode = z.infer<typeof AiMode>;

export const OnboardingStatus = z.enum(['not_started', 'in_progress', 'completed', 'skipped']);
export type OnboardingStatus = z.infer<typeof OnboardingStatus>;

export const SearchTimeline = z.enum(['exploring', 'within_3_months', 'as_soon_as_possible']);
export type SearchTimeline = z.infer<typeof SearchTimeline>;

export const SearchGoals = z.object({
  targetRoles: z.array(tag).max(20).default([]),
  timeline: SearchTimeline.nullable().default(null),
  weeklyApplicationTarget: z.number().int().min(0).max(100).nullable().default(null),
  notes: shortText(2000).default(''),
});
export type SearchGoals = z.infer<typeof SearchGoals>;

export const OnboardingState = z.object({
  status: OnboardingStatus,
  step: z.number().int().min(0).max(20),
  aiMode: AiMode,
  goals: SearchGoals,
  updatedAt: isoDate.nullable(),
});
export type OnboardingState = z.infer<typeof OnboardingState>;

export const OnboardingUpdate = OnboardingState.omit({ updatedAt: true }).partial();
export type OnboardingUpdate = z.infer<typeof OnboardingUpdate>;

/* ------------------------------------------------------------------ */
/* Profile and preferences                                             */
/* ------------------------------------------------------------------ */

export const WorkArrangement = z.enum(['remote', 'hybrid', 'onsite']);
export type WorkArrangement = z.infer<typeof WorkArrangement>;

export const TriState = z.enum(['yes', 'no', 'unknown']);
export type TriState = z.infer<typeof TriState>;

/** Month precision dates: YYYY-MM. */
export const YearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');

export const ExperienceEntry = z.object({
  id: z.string().min(1).max(64),
  employer: shortText(160).min(1),
  title: shortText(160).min(1),
  start: YearMonth,
  end: YearMonth.nullable(),
  summary: shortText(4000).default(''),
  /** Achievement bullets, written or confirmed by the person. */
  highlights: z.array(shortText(600).min(1)).max(30).default([]),
  /** True only when the person has confirmed this entry is accurate. */
  verified: z.boolean().default(false),
});
export type ExperienceEntry = z.infer<typeof ExperienceEntry>;

export const ProfileLink = z.object({
  label: shortText(60).default(''),
  url: z.url({ protocol: /^https?$/ }).max(2048),
});
export type ProfileLink = z.infer<typeof ProfileLink>;

export const ContactDetails = z.object({
  email: z.union([z.literal(''), z.email().max(254)]).default(''),
  phone: shortText(40).default(''),
  location: shortText(120).default(''),
  links: z.array(ProfileLink).max(10).default([]),
});
export type ContactDetails = z.infer<typeof ContactDetails>;

export const EducationEntry = z.object({
  id: z.string().min(1).max(64),
  institution: shortText(200).min(1),
  qualification: shortText(200).default(''),
  field: shortText(200).default(''),
  start: YearMonth.nullable().default(null),
  end: YearMonth.nullable().default(null),
  verified: z.boolean().default(false),
});
export type EducationEntry = z.infer<typeof EducationEntry>;

export const CertificationEntry = z.object({
  id: z.string().min(1).max(64),
  name: shortText(200).min(1),
  issuer: shortText(200).default(''),
  date: YearMonth.nullable().default(null),
  verified: z.boolean().default(false),
});
export type CertificationEntry = z.infer<typeof CertificationEntry>;

export const SavedAnswer = z.object({
  id: z.string().min(1).max(64),
  question: shortText(300).min(1),
  answer: shortText(4000),
});
export type SavedAnswer = z.infer<typeof SavedAnswer>;

export const Profile = z.object({
  displayName: shortText(120).default(''),
  headline: shortText(200).default(''),
  targetRoles: z.array(tag).max(20).default([]),
  preferredCountries: z.array(tag).max(30).default([]),
  workArrangements: z.array(WorkArrangement).max(3).default([]),
  openToRelocation: TriState.default('unknown'),
  /** Countries where the person states they are already authorised to work. */
  workAuthorizedCountries: z.array(tag).max(30).default([]),
  requiresSponsorship: TriState.default('unknown'),
  skills: z.array(tag).max(200).default([]),
  experience: z.array(ExperienceEntry).max(60).default([]),
  contact: ContactDetails.default({ email: '', phone: '', location: '', links: [] }),
  education: z.array(EducationEntry).max(30).default([]),
  certifications: z.array(CertificationEntry).max(50).default([]),
  answers: z.array(SavedAnswer).max(100).default([]),
  updatedAt: isoDate.nullable().default(null),
});
export type Profile = z.infer<typeof Profile>;

export const ProfileUpdate = Profile.omit({ updatedAt: true });
export type ProfileUpdate = z.input<typeof ProfileUpdate>;

/* ------------------------------------------------------------------ */
/* Jobs                                                                */
/* ------------------------------------------------------------------ */

/** Where a stored job field came from. Extracted fields must carry their evidence. */
export const FieldOrigin = z.enum([
  'extracted',
  'user',
  // v0.2.0: a structured field from an official job-board interface (evidence names the field).
  'source',
]);
export type FieldOrigin = z.infer<typeof FieldOrigin>;

export const FieldProvenance = z.object({
  origin: FieldOrigin,
  /** Verbatim snippet from the description the value was taken from. */
  evidence: shortText(500).nullable(),
});
export type FieldProvenance = z.infer<typeof FieldProvenance>;

export const ExtractedField = z.object({
  value: shortText(300),
  evidence: shortText(500),
});
export type ExtractedField = z.infer<typeof ExtractedField>;

export const VerificationStatus = z.enum(['unverified', 'verified']);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const JobVerification = z.object({
  status: VerificationStatus,
  checkedAt: isoDate.nullable(),
  note: shortText(300),
});
export type JobVerification = z.infer<typeof JobVerification>;

const httpUrl = z
  .url({ protocol: /^https?$/ })
  .max(2048);

export const JobExtractRequest = z.object({
  description: z.string().max(100_000).default(''),
  sourceUrl: httpUrl.nullable().default(null),
});
export type JobExtractRequest = z.input<typeof JobExtractRequest>;

export const JobExtraction = z.object({
  title: ExtractedField.nullable(),
  employer: ExtractedField.nullable(),
  location: ExtractedField.nullable(),
  salary: ExtractedField.nullable(),
  workArrangement: z.object({ value: WorkArrangement, evidence: shortText(500) }).nullable(),
  sourceUrl: httpUrl.nullable(),
  sourceHost: shortText(255).nullable(),
  description: z.string(),
  warnings: z.array(z.string()),
});
export type JobExtraction = z.infer<typeof JobExtraction>;

const provenanceFor = z.object({
  title: FieldProvenance,
  employer: FieldProvenance,
  location: FieldProvenance.nullable(),
  salary: FieldProvenance.nullable(),
});

export const JobCreate = z.object({
  title: shortText(300).min(1),
  employer: shortText(300).min(1),
  location: shortText(300).nullable().default(null),
  salary: shortText(300).nullable().default(null),
  workArrangement: WorkArrangement.nullable().default(null),
  sourceUrl: httpUrl.nullable().default(null),
  description: z.string().max(100_000).default(''),
  provenance: provenanceFor,
  /** Save even if a job with the same source/identity already exists. */
  allowDuplicate: z.boolean().default(false),
});
export type JobCreate = z.input<typeof JobCreate>;

export const Job = z.object({
  id: z.string(),
  title: z.string(),
  employer: z.string(),
  location: z.string().nullable(),
  salary: z.string().nullable(),
  workArrangement: WorkArrangement.nullable(),
  sourceUrl: z.string().nullable(),
  description: z.string(),
  provenance: provenanceFor,
  verification: JobVerification,
  dedupeKey: z.string(),
  capturedAt: isoDate,
  /** v0.2.0: present when the job was saved from an official job-board interface. */
  source: z.lazy(() => JobSourceLink).nullable().optional(),
});
export type Job = z.infer<typeof Job>;

/* ------------------------------------------------------------------ */
/* Official job sources (v0.2.0)                                       */
/* ------------------------------------------------------------------ */

export const JobSourceId = z.enum(['greenhouse', 'lever', 'ashby', 'workable', 'workday']);
export type JobSourceId = z.infer<typeof JobSourceId>;

/**
 * "listed": present in the provider's live feed when last fetched (a verified,
 * timestamped fact). "not_listed": absent from a later successful fetch.
 * "unknown": never checked, or the last check failed.
 */
export const PostingAvailability = z.enum(['listed', 'not_listed', 'unknown']);
export type PostingAvailability = z.infer<typeof PostingAvailability>;

export const JobSourceLink = z.object({
  provider: JobSourceId,
  board: z.string(),
  postingId: z.string(),
  retrievedAt: isoDate,
  availability: PostingAvailability,
  lastCheckedAt: isoDate.nullable(),
});
export type JobSourceLink = z.infer<typeof JobSourceLink>;

export const SourceSalary = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  currency: z.string().nullable(),
  interval: z.string().nullable(),
  /** Exactly as the provider published it, or built only from its numeric fields. */
  text: z.string(),
});
export type SourceSalary = z.infer<typeof SourceSalary>;

export const DiscoveredPosting = z.object({
  id: z.string(),
  source: JobSourceId,
  board: z.string(),
  postingId: z.string(),
  title: z.string(),
  employer: z.string(),
  /** "provider": the company name came from the API; "board": only the board identifier was available. */
  employerOrigin: z.enum(['provider', 'board']),
  location: z.string().nullable(),
  locations: z.array(z.string()),
  countries: z.array(z.string()),
  workArrangement: WorkArrangement.nullable(),
  /** Where the work arrangement came from; null when not stated. */
  workArrangementOrigin: z.enum(['provider_field', 'location_text']).nullable(),
  postingUrl: httpUrl,
  applyUrl: httpUrl.nullable(),
  description: z.string(),
  requirements: z.array(z.string()),
  salary: SourceSalary.nullable(),
  employmentType: z.string().nullable(),
  department: z.string().nullable(),
  postedAt: isoDate.nullable(),
  updatedAt: isoDate.nullable(),
  retrievedAt: isoDate,
  availability: PostingAvailability,
  lastSeenAt: isoDate.nullable(),
  savedJobId: z.string().nullable(),
});
export type DiscoveredPosting = z.infer<typeof DiscoveredPosting>;

export const JobSourceInfo = z.object({
  id: JobSourceId,
  label: z.string(),
  supported: z.boolean(),
  /** What the provider's public interface allows. None of them offers cross-company search. */
  capabilities: z.object({ listBoard: z.boolean(), singlePosting: z.boolean(), salary: z.boolean(), keywordSearch: z.boolean() }),
  boardHint: z.string(),
  docsUrl: z.string(),
  limitations: z.array(z.string()),
});
export type JobSourceInfo = z.infer<typeof JobSourceInfo>;

export const DiscoveryRequest = z.object({
  /** A board identifier, or the company's careers-page URL on the provider. */
  board: shortText(300).min(1),
  source: JobSourceId.optional(),
  query: shortText(200).default(''),
  country: shortText(80).default(''),
  remoteOnly: z.boolean().default(false),
  /** Bypass the response cache (still rate-limited). */
  refresh: z.boolean().default(false),
});
export type DiscoveryRequest = z.input<typeof DiscoveryRequest>;

export const DiscoveredPostingView = DiscoveredPosting.extend({
  fit: z.object({ score: z.number(), label: z.string() }).nullable(),
  eligibility: z.enum(['confirmed', 'unconfirmed', 'ineligible']).nullable(),
  duplicates: z.array(z.object({ jobId: z.string(), title: z.string(), reason: z.string() })),
  /** Hours since the provider feed was last fetched successfully. */
  ageHours: z.number(),
});
export type DiscoveredPostingView = z.infer<typeof DiscoveredPostingView>;

export const DiscoveryResult = z.object({
  source: JobSourceId,
  board: z.string(),
  employer: z.string().nullable(),
  fetchedAt: isoDate,
  fromCache: z.boolean(),
  totalListed: z.number().int(),
  postings: z.array(DiscoveredPostingView),
  notes: z.array(z.string()),
});
export type DiscoveryResult = z.infer<typeof DiscoveryResult>;


/* ------------------------------------------------------------------ */
/* Applications / tracker                                              */
/* ------------------------------------------------------------------ */

export const ApplicationStatus = z.enum([
  'discovered',
  'shortlisted',
  'preparing',
  'ready_for_review',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

export const ActivityKind = z.enum([
  'created',
  'status_changed',
  'note',
  // v0.2.0: every meaningful change is recorded with its own kind.
  'reopened',
  'contact',
  'reminder',
  'interview',
  'document',
]);
export type ActivityKind = z.infer<typeof ActivityKind>;

export const ActivityEntry = z.object({
  id: z.string(),
  applicationId: z.string(),
  at: isoDate,
  kind: ActivityKind,
  from: ApplicationStatus.nullable(),
  to: ApplicationStatus.nullable(),
  note: z.string(),
});
export type ActivityEntry = z.infer<typeof ActivityEntry>;

export const Application = z.object({
  id: z.string(),
  jobId: z.string(),
  status: ApplicationStatus,
  createdAt: isoDate,
  updatedAt: isoDate,
  statusChangedAt: isoDate,
  /** Set only when the person explicitly confirmed they submitted the application. */
  appliedConfirmedAt: isoDate.nullable(),
});
export type Application = z.infer<typeof Application>;

export const ApplicationView = Application.extend({
  job: Job,
  activity: z.array(ActivityEntry),
  /** Statuses this application may move to next (server-side workflow rules). */
  allowedNext: z.array(ApplicationStatus),
});
export type ApplicationView = z.infer<typeof ApplicationView>;

export const StatusTransitionRequest = z.object({
  to: ApplicationStatus,
  note: shortText(2000).default(''),
  /** Must be true to move into `applied`: the person confirms they submitted it themselves. */
  confirmSubmitted: z.boolean().default(false),
});
export type StatusTransitionRequest = z.input<typeof StatusTransitionRequest>;

export const NoteRequest = z.object({ note: shortText(2000).min(1) });
export type NoteRequest = z.infer<typeof NoteRequest>;

export const JobCreateResult = z.object({ job: Job, application: ApplicationView });
export type JobCreateResult = z.infer<typeof JobCreateResult>;

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export const NextAction = z.object({
  applicationId: z.string(),
  jobTitle: z.string(),
  employer: z.string(),
  status: ApplicationStatus,
  label: z.string(),
});
export type NextAction = z.infer<typeof NextAction>;

export const DashboardSummaryBase = z.object({
  total: z.number().int(),
  active: z.number().int(),
  submitted: z.number().int(),
  byStatus: z.record(ApplicationStatus, z.number().int()),
  nextActions: z.array(NextAction),
  recentActivity: z.array(ActivityEntry.extend({ jobTitle: z.string(), employer: z.string() })),
  generatedAt: isoDate,
});


/* ------------------------------------------------------------------ */
/* Errors and health                                                   */
/* ------------------------------------------------------------------ */

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

export const Health = z.object({
  status: z.literal('ok'),
  version: z.string(),
  schemaVersion: z.number().int(),
  aiMode: AiMode,
});
export type Health = z.infer<typeof Health>;

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export const ExportBundle = z.object({
  format: z.literal('reboundops-export'),
  formatVersion: z.literal(1),
  exportedAt: isoDate,
  schemaVersion: z.number().int(),
  onboarding: OnboardingState,
  profile: Profile,
  jobs: z.array(Job),
  applications: z.array(Application),
  activity: z.array(ActivityEntry),
  contacts: z.array(z.lazy(() => Contact)).default([]),
  reminders: z.array(z.lazy(() => Reminder)).default([]),
});
export type ExportBundle = z.infer<typeof ExportBundle>;

/* ------------------------------------------------------------------ */
/* Assessment (fit + eligibility)                                      */
/* ------------------------------------------------------------------ */

export const EvidenceSource = z.enum(['job', 'profile']);
export type EvidenceSource = z.infer<typeof EvidenceSource>;

export const Evidence = z.object({ source: EvidenceSource, text: z.string() });
export type Evidence = z.infer<typeof Evidence>;

export const CriterionKey = z.enum(['role', 'skills', 'experience', 'location']);
export type CriterionKey = z.infer<typeof CriterionKey>;

export const FitCriterion = z.object({
  key: CriterionKey,
  label: z.string(),
  weight: z.number(),
  /** 0–5, or null when there is not enough information to score honestly. */
  score: z.number().min(0).max(5).nullable(),
  rationale: z.string(),
  evidence: z.array(Evidence),
  /** Profile information that would let this criterion be scored. */
  missing: z.array(z.string()),
});
export type FitCriterion = z.infer<typeof FitCriterion>;

export const EligibilityStatus = z.enum(['confirmed', 'unconfirmed', 'ineligible']);
export type EligibilityStatus = z.infer<typeof EligibilityStatus>;

export const EligibilityCheck = z.object({
  key: z.enum(['work_authorization', 'credentials']),
  label: z.string(),
  status: EligibilityStatus,
  reason: z.string(),
  evidence: z.array(Evidence),
  /** Applicant information that is missing (as opposed to a disqualifier). */
  missing: z.array(z.string()),
});
export type EligibilityCheck = z.infer<typeof EligibilityCheck>;

export const Assessment = z.object({
  applicationId: z.string(),
  rubricVersion: z.string(),
  assessedAt: isoDate,
  fit: z.object({
    /** Weighted 0–5 score rounded to 0.5, or null if fewer than two criteria could be scored. */
    overall: z.number().min(0).max(5).nullable(),
    scoredCriteria: z.number().int(),
    totalCriteria: z.number().int(),
    criteria: z.array(FitCriterion),
  }),
  eligibility: z.object({
    status: EligibilityStatus,
    checks: z.array(EligibilityCheck),
  }),
  /** Deduplicated list of profile details the person could add. */
  missingInfo: z.array(z.string()),
  disclaimer: z.string(),
});
export type Assessment = z.infer<typeof Assessment>;

export const AssessmentSummary = z.object({
  applicationId: z.string(),
  overall: z.number().nullable(),
  eligibility: EligibilityStatus,
});
export type AssessmentSummary = z.infer<typeof AssessmentSummary>;

/* ------------------------------------------------------------------ */
/* Resume import                                                       */
/* ------------------------------------------------------------------ */

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const ResumeImportRequest = z.union([
  z.object({
    filename: shortText(255).min(1),
    contentBase64: z.string().min(1).max(Math.ceil((MAX_RESUME_BYTES * 4) / 3) + 8),
    /** Text the person typed or pasted for a file whose text could not be extracted (e.g. a scanned PDF). The original file is still kept. */
    manualText: z.string().min(1).max(200_000).optional(),
  }),
  z.object({ text: z.string().min(1).max(200_000) }),
]);
export type ResumeImportRequest = z.infer<typeof ResumeImportRequest>;

export const ResumeFile = z.object({
  id: z.string(),
  filename: z.string(),
  mediaType: z.string(),
  sha256: z.string(),
  size: z.number().int(),
  importedAt: isoDate,
});
export type ResumeFile = z.infer<typeof ResumeFile>;

export const ResumeProposal = z.object({
  displayName: z.string(),
  headline: z.string(),
  contact: ContactDetails,
  experience: z.array(ExperienceEntry),
  education: z.array(EducationEntry),
  certifications: z.array(CertificationEntry),
  skills: z.array(z.string()),
});
export type ResumeProposal = z.infer<typeof ResumeProposal>;

export const ResumeExtraction = z.object({
  method: z.enum(['pdf_text', 'docx', 'text', 'pasted', 'manual_entry']),
  /** How reliable the text extraction was (not how good the resume is). */
  confidence: z.enum(['high', 'medium', 'low']),
  pages: z.number().int().nullable(),
  links: z.array(z.string()),
});
export type ResumeExtraction = z.infer<typeof ResumeExtraction>;

export const ResumeImportResult = z.object({
  file: ResumeFile,
  text: z.string(),
  proposal: ResumeProposal,
  warnings: z.array(z.string()),
  extraction: ResumeExtraction,
});
export type ResumeImportResult = z.infer<typeof ResumeImportResult>;

/* ------------------------------------------------------------------ */
/* Tailored documents                                                  */
/* ------------------------------------------------------------------ */

export const DraftHighlight = z.object({
  id: z.string(),
  text: shortText(600),
  /** The fact text this highlight came from; kept even after edits. */
  originalText: z.string(),
  origin: z.enum(['fact', 'edited']),
  include: z.boolean(),
  /** Number of posting terms the original highlight mentions (used for ordering). */
  relevance: z.number().int(),
});
export type DraftHighlight = z.infer<typeof DraftHighlight>;

export const DraftExperience = z.object({
  factId: z.string(),
  employer: z.string(),
  title: z.string(),
  start: YearMonth,
  end: YearMonth.nullable(),
  include: z.boolean(),
  highlights: z.array(DraftHighlight),
});
export type DraftExperience = z.infer<typeof DraftExperience>;

export const ResumeDraft = z.object({
  kind: z.literal('resume'),
  applicationId: z.string(),
  generatedAt: isoDate,
  updatedAt: isoDate,
  profileUpdatedAt: isoDate.nullable(),
  header: z.object({
    name: z.string(),
    headline: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    links: z.array(ProfileLink),
  }),
  summary: z.object({ text: shortText(2000), origin: z.enum(['profile', 'edited']) }),
  experience: z.array(DraftExperience),
  skills: z.array(z.object({ name: z.string(), matched: z.boolean(), include: z.boolean() })),
  education: z.array(EducationEntry.omit({ verified: true }).extend({ factId: z.string() }).omit({ id: true })),
  certifications: z.array(CertificationEntry.omit({ verified: true }).extend({ factId: z.string() }).omit({ id: true })),
  warnings: z.array(z.string()),
});
export type ResumeDraft = z.infer<typeof ResumeDraft>;

export const ResumeDraftUpdate = z.object({
  summary: shortText(2000).optional(),
  experience: z
    .array(
      z.object({
        factId: z.string(),
        include: z.boolean(),
        highlights: z.array(z.object({ id: z.string(), text: shortText(600), include: z.boolean() })),
      }),
    )
    .optional(),
  skills: z.array(z.object({ name: z.string(), include: z.boolean() })).optional(),
});
export type ResumeDraftUpdate = z.infer<typeof ResumeDraftUpdate>;

export const SentenceSource = z.object({
  kind: z.enum(['job', 'experience', 'skill', 'profile', 'template']),
  refId: z.string().nullable(),
});

export const CoverLetterDraft = z.object({
  kind: z.literal('cover_letter'),
  applicationId: z.string(),
  generatedAt: isoDate,
  updatedAt: isoDate,
  text: z.string().max(20_000),
  /** Sources for each generated sentence (dropped once the person edits the letter). */
  sources: z.array(z.object({ sentence: z.string(), source: SentenceSource })),
  edited: z.boolean(),
  warnings: z.array(z.string()),
});
export type CoverLetterDraft = z.infer<typeof CoverLetterDraft>;

export const CoverLetterUpdate = z.object({ text: z.string().max(20_000) });

export const GenerateDocumentsRequest = z.object({
  /** Required to replace drafts that the person has already edited. */
  overwrite: z.boolean().default(false),
});
export type CoverLetterUpdate = z.infer<typeof CoverLetterUpdate>;

export const DocumentKind = z.enum(['resume', 'cover_letter']);
export type DocumentKind = z.infer<typeof DocumentKind>;

export const ExportFormat = z.enum(['pdf', 'docx']);
export type ExportFormat = z.infer<typeof ExportFormat>;

export const DocumentsBundle = z.object({
  resume: ResumeDraft.nullable(),
  coverLetter: CoverLetterDraft.nullable(),
  /** True when the profile changed after the drafts were generated. */
  profileChangedSinceDraft: z.boolean(),
});
export type DocumentsBundle = z.infer<typeof DocumentsBundle>;

export const ExportCheck = z.object({
  ok: z.boolean(),
  checked: z.array(z.string()),
  missing: z.array(z.string()),
  problems: z.array(z.string()),
});
export type ExportCheck = z.infer<typeof ExportCheck>;

/* ------------------------------------------------------------------ */
/* Application preparation (M4)                                        */
/* ------------------------------------------------------------------ */

export const AnswerStatus = z.enum(['drafted', 'needs_input', 'reviewed']);
export type AnswerStatus = z.infer<typeof AnswerStatus>;

export const AnswerSource = z.object({
  kind: z.enum(['saved_answer', 'profile', 'experience', 'none', 'user']),
  detail: z.string(),
});
export type AnswerSource = z.infer<typeof AnswerSource>;

export const ScreeningAnswer = z.object({
  id: z.string(),
  question: shortText(500).min(1),
  answer: shortText(4000),
  status: AnswerStatus,
  source: AnswerSource,
  /** Why the answer needs input, or what to double-check. */
  note: z.string(),
});
export type ScreeningAnswer = z.infer<typeof ScreeningAnswer>;

export const ApplicationPackage = z.object({
  kind: z.literal('package'),
  applicationId: z.string(),
  updatedAt: isoDate,
  officialApplyUrl: z.url({ protocol: /^https?$/ }).max(2048).nullable(),
  eligibilityAcknowledged: z.boolean(),
  answers: z.array(ScreeningAnswer).max(100),
  exports: z.object({ resume: isoDate.nullable(), cover_letter: isoDate.nullable() }),
});
export type ApplicationPackage = z.infer<typeof ApplicationPackage>;

export const ChecklistItem = z.object({
  key: z.enum(['resume', 'cover_letter', 'eligibility', 'answers', 'official_link', 'posting_checked']),
  label: z.string(),
  done: z.boolean(),
  detail: z.string(),
  optional: z.boolean(),
});
export type ChecklistItem = z.infer<typeof ChecklistItem>;

export const PackageView = z.object({
  package: ApplicationPackage,
  checklist: z.array(ChecklistItem),
  /** Where to apply: the link you set, else the posting URL you saved. */
  applyUrl: z.string().nullable(),
  ready: z.boolean(),
});
export type PackageView = z.infer<typeof PackageView>;

export const PackageUpdate = z.object({
  officialApplyUrl: z.url({ protocol: /^https?$/ }).max(2048).nullable().optional(),
  eligibilityAcknowledged: z.boolean().optional(),
  /** The person states they checked the posting on the official site. */
  postingCheckedByUser: z.boolean().optional(),
});
export type PackageUpdate = z.infer<typeof PackageUpdate>;

export const AddQuestionsRequest = z.object({ questions: z.array(shortText(500).min(1)).min(1).max(50) });
export type AddQuestionsRequest = z.infer<typeof AddQuestionsRequest>;

export const AnswerUpdate = z.object({
  answer: shortText(4000),
  /** Mark as reviewed by the person. */
  reviewed: z.boolean().default(true),
  /** Also save this question/answer to the profile for reuse. */
  saveToProfile: z.boolean().default(false),
});
export type AnswerUpdate = z.input<typeof AnswerUpdate>;

/* ------------------------------------------------------------------ */
/* Tracking & follow-ups (M5)                                          */
/* ------------------------------------------------------------------ */

export const IsoDay = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Use YYYY-MM-DD');

export const Contact = z.object({
  id: z.string(),
  applicationId: z.string(),
  name: shortText(120).min(1),
  role: shortText(120).default(''),
  email: z.union([z.literal(''), z.email().max(254)]).default(''),
  phone: shortText(40).default(''),
  notes: shortText(4000).default(''),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Contact = z.infer<typeof Contact>;

export const ContactInput = Contact.pick({ name: true, role: true, email: true, phone: true, notes: true });
export type ContactInput = z.input<typeof ContactInput>;

export const ReminderPriority = z.enum(['high', 'normal', 'low']);
export type ReminderPriority = z.infer<typeof ReminderPriority>;

/** Returned by a delete so the client can offer Undo. */
export const DeletedItem = z.object({ id: z.string(), kind: z.enum(['contact', 'reminder']), label: z.string(), deletedAt: isoDate, undoUntil: isoDate });
export type DeletedItem = z.infer<typeof DeletedItem>;

export const Reminder = z.object({
  id: z.string(),
  applicationId: z.string(),
  dueOn: IsoDay,
  label: shortText(200).min(1),
  done: z.boolean(),
  doneAt: isoDate.nullable(),
  createdAt: isoDate,
  /** v0.2.0 (absent in older data, defaults apply). */
  priority: ReminderPriority.default('normal'),
  notes: shortText(2000).default(''),
});
export type Reminder = z.infer<typeof Reminder>;
/** A reminder as written (priority and notes may be omitted). */
export type ReminderRecordInput = z.input<typeof Reminder>;

export const ReminderInput = z.object({
  dueOn: IsoDay,
  label: shortText(200).min(1),
  priority: ReminderPriority.optional(),
  notes: shortText(2000).optional(),
});
export type ReminderInput = z.infer<typeof ReminderInput>;
export const ReminderUpdate = z.object({
  done: z.boolean().optional(),
  dueOn: IsoDay.optional(),
  label: shortText(200).min(1).optional(),
  priority: ReminderPriority.optional(),
  notes: shortText(2000).optional(),
});
export type ReminderUpdate = z.infer<typeof ReminderUpdate>;

/** Interview notes and preparation (v0.2.0). Written by the person; never sent anywhere. */
export const InterviewNote = z.object({
  id: z.string(),
  applicationId: z.string(),
  stage: shortText(80).default('Interview'),
  scheduledFor: isoDate.nullable().default(null),
  interviewers: shortText(300).default(''),
  preparation: shortText(8000).default(''),
  questionsToAsk: shortText(4000).default(''),
  notes: shortText(8000).default(''),
  outcome: z.enum(['pending', 'went_well', 'mixed', 'went_poorly']).default('pending'),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type InterviewNote = z.infer<typeof InterviewNote>;
export const InterviewNoteInput = InterviewNote.pick({ stage: true, scheduledFor: true, interviewers: true, preparation: true, questionsToAsk: true, notes: true, outcome: true }).partial();
export type InterviewNoteInput = z.input<typeof InterviewNoteInput>;

export const FollowUpKind = z.enum(['after_applying', 'after_interview', 'thank_you', 'withdraw']);
export type FollowUpKind = z.infer<typeof FollowUpKind>;

export const FollowUpDraft = z.object({
  kind: FollowUpKind,
  to: z.string().nullable(),
  subject: z.string(),
  body: z.string(),
  placeholders: z.number().int(),
  /** mailto: link that opens the person's own mail app; nothing is sent by ReboundOps. */
  mailto: z.string().nullable(),
});
export type FollowUpDraft = z.infer<typeof FollowUpDraft>;

export const ReminderView = Reminder.extend({ jobTitle: z.string(), employer: z.string(), overdue: z.boolean() });
export type ReminderView = z.infer<typeof ReminderView>;

export const Analytics = z.object({
  weekly: z.array(z.object({ weekStart: IsoDay, saved: z.number().int(), submitted: z.number().int() })),
  submittedTotal: z.number().int(),
  responded: z.number().int(),
  /** Share of submitted applications with a recorded response (interview, offer or rejection); null when none submitted. */
  responseRate: z.number().nullable(),
  medianDaysToResponse: z.number().nullable(),
  caveat: z.string().nullable(),
});
export type Analytics = z.infer<typeof Analytics>;

export const DashboardSummary = DashboardSummaryBase.extend({
  analytics: Analytics,
  reminders: z.array(ReminderView),
});
export type DashboardSummary = z.infer<typeof DashboardSummary>;

/* ------------------------------------------------------------------ */
/* Optional AI (M6)                                                    */
/* ------------------------------------------------------------------ */

export const ProviderId = z.enum(['ollama', 'anthropic', 'openai', 'gemini', 'openrouter']);
export type ProviderId = z.infer<typeof ProviderId>;

export const AiSettings = z.object({
  provider: ProviderId.nullable(),
  model: shortText(200).default(''),
  /** Ollama only; must be a loopback address. */
  baseUrl: shortText(300).default(''),
  /** When the person agreed to send selected text to each cloud provider. */
  consent: z.partialRecord(ProviderId, isoDate).default({}),
});
export type AiSettings = z.infer<typeof AiSettings>;

export const AiSettingsUpdate = z.object({
  provider: ProviderId.nullable(),
  model: shortText(200).default(''),
  baseUrl: shortText(300).default(''),
  /** Must be true to enable a cloud provider. */
  consentToCloud: z.boolean().default(false),
});
export type AiSettingsUpdate = z.input<typeof AiSettingsUpdate>;

export const AiProviderInfo = z.object({
  id: ProviderId,
  label: z.string(),
  local: z.boolean(),
  /** Whether the API key environment variable is set (the key itself is never exposed). */
  keyConfigured: z.boolean(),
  keyEnvVar: z.string().nullable(),
  defaultModel: z.string().nullable(),
});
export type AiProviderInfo = z.infer<typeof AiProviderInfo>;

export const AiSettingsView = z.object({
  settings: AiSettings,
  aiMode: AiMode,
  /** True when AI features can be used right now. */
  active: z.boolean(),
  reason: z.string(),
  providers: z.array(AiProviderInfo),
});
export type AiSettingsView = z.infer<typeof AiSettingsView>;

export const RewriteRequest = z.object({
  text: shortText(1500).min(1),
  purpose: z.enum(['highlight', 'paragraph']),
  jobTitle: shortText(200).optional(),
  /** The person confirmed sending this text to the configured provider. */
  confirmSend: z.boolean().default(false),
});
export type RewriteRequest = z.input<typeof RewriteRequest>;

export const RewriteResult = z.object({
  suggestion: z.string(),
  /** False when the suggestion added facts and was withheld. */
  accepted: z.boolean(),
  problems: z.array(z.string()),
  provider: ProviderId,
  model: z.string(),
  local: z.boolean(),
});
export type RewriteResult = z.infer<typeof RewriteResult>;

/* ------------------------------------------------------------------ */
/* Job edits (M7)                                                      */
/* ------------------------------------------------------------------ */

export const JobUpdate = z.object({
  title: shortText(300).min(1).optional(),
  employer: shortText(300).min(1).optional(),
  location: shortText(300).nullable().optional(),
  salary: shortText(300).nullable().optional(),
  workArrangement: WorkArrangement.nullable().optional(),
  sourceUrl: z.url({ protocol: /^https?$/ }).max(2048).nullable().optional(),
});
export type JobUpdate = z.infer<typeof JobUpdate>;

/* ------------------------------------------------------------------ */
/* Data import (M8)                                                    */
/* ------------------------------------------------------------------ */

const importText = (max: number) => z.string().max(max);

export const ImportExperience = z
  .object({
    employer: shortText(160).min(1),
    title: shortText(160).min(1),
    start: YearMonth,
    end: YearMonth.nullable().optional(),
    summary: importText(4000).optional(),
    highlights: z.array(importText(600)).max(30).optional(),
  })
  .strict();

export const ImportEducation = z
  .object({
    institution: shortText(200).min(1),
    qualification: shortText(200).optional(),
    field: shortText(200).optional(),
    start: YearMonth.nullable().optional(),
    end: YearMonth.nullable().optional(),
  })
  .strict();

export const ImportProfile = z
  .object({
    displayName: shortText(120).optional(),
    headline: shortText(200).optional(),
    email: z.union([z.literal(''), z.email().max(254)]).optional(),
    phone: shortText(40).optional(),
    location: shortText(120).optional(),
    links: z.array(z.object({ label: shortText(60).optional(), url: z.url({ protocol: /^https?$/ }).max(2048) }).strict()).max(10).optional(),
    targetRoles: z.array(tag).max(20).optional(),
    preferredCountries: z.array(tag).max(30).optional(),
    workArrangements: z.array(WorkArrangement).max(3).optional(),
    openToRelocation: TriState.optional(),
    workAuthorizedCountries: z.array(tag).max(30).optional(),
    requiresSponsorship: TriState.optional(),
    skills: z.array(tag).max(200).optional(),
    experience: z.array(ImportExperience).max(60).optional(),
    education: z.array(ImportEducation).max(30).optional(),
    answers: z.array(z.object({ question: shortText(300).min(1), answer: importText(4000) }).strict()).max(100).optional(),
  })
  .strict();

export const ImportJob = z
  .object({
    externalId: shortText(120).optional(),
    title: shortText(300).min(1),
    employer: shortText(300).min(1),
    location: shortText(300).nullable().optional(),
    salary: shortText(300).nullable().optional(),
    sourceUrl: z.url({ protocol: /^https?$/ }).max(2048).nullable().optional(),
    description: importText(100_000).optional(),
    capturedAt: isoDate.optional(),
    status: ApplicationStatus.optional(),
    appliedAt: isoDate.nullable().optional(),
    history: z.array(z.object({ at: isoDate, status: ApplicationStatus, note: importText(2000).optional() }).strict()).max(200).optional(),
    notes: z.array(z.object({ at: isoDate, text: importText(4000).min(1) }).strict()).max(200).optional(),
  })
  .strict();
export type ImportJob = z.infer<typeof ImportJob>;

export const ImportFile = z
  .object({
    format: z.literal('reboundops-import'),
    formatVersion: z.literal(1),
    source: shortText(200).optional(),
    exportedAt: isoDate.optional(),
    profile: ImportProfile.optional(),
    jobs: z.array(z.unknown()).max(5000).optional(),
  })
  .strict();
export type ImportFile = z.infer<typeof ImportFile>;

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export const ImportPreviewRequest = z.object({ filename: shortText(255).default('import.json'), content: z.string().min(2).max(MAX_IMPORT_BYTES) });
export type ImportPreviewRequest = z.input<typeof ImportPreviewRequest>;

export const ImportPreview = z.object({
  token: z.string(),
  expiresAt: isoDate,
  sourceFormat: z.enum(['reboundops-import', 'reboundops-export']),
  sha256: z.string(),
  profile: z.object({
    fieldsToFill: z.array(z.string()),
    skillsToAdd: z.array(z.string()),
    experienceToAdd: z.number().int(),
    educationToAdd: z.number().int(),
    answersToAdd: z.number().int(),
  }),
  jobs: z.object({
    toAdd: z.array(z.object({ index: z.number().int(), title: z.string(), employer: z.string(), status: ApplicationStatus })),
    duplicates: z.array(z.object({ index: z.number().int(), title: z.string(), employer: z.string(), reason: z.string() })),
    rejected: z.array(z.object({ index: z.number().int(), reason: z.string() })),
  }),
  warnings: z.array(z.string()),
});
export type ImportPreview = z.infer<typeof ImportPreview>;

export const ImportCommitRequest = z.object({ token: z.string().min(1), confirm: z.literal(true) });
export type ImportCommitRequest = z.infer<typeof ImportCommitRequest>;

export const ImportResult = z.object({ jobsAdded: z.number().int(), profileUpdated: z.boolean(), skipped: z.number().int(), rejected: z.number().int() });
export type ImportResult = z.infer<typeof ImportResult>;
