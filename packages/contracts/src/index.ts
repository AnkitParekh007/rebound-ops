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
export const FieldOrigin = z.enum(['extracted', 'user']);
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
});
export type Job = z.infer<typeof Job>;

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

export const ActivityKind = z.enum(['created', 'status_changed', 'note']);
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

export const DashboardSummary = z.object({
  total: z.number().int(),
  active: z.number().int(),
  submitted: z.number().int(),
  byStatus: z.record(ApplicationStatus, z.number().int()),
  nextActions: z.array(NextAction),
  recentActivity: z.array(ActivityEntry.extend({ jobTitle: z.string(), employer: z.string() })),
  generatedAt: isoDate,
});
export type DashboardSummary = z.infer<typeof DashboardSummary>;

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
  z.object({ filename: shortText(255).min(1), contentBase64: z.string().min(1).max(Math.ceil((MAX_RESUME_BYTES * 4) / 3) + 8) }),
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

export const ResumeImportResult = z.object({
  file: ResumeFile,
  text: z.string(),
  proposal: ResumeProposal,
  warnings: z.array(z.string()),
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
export type CoverLetterUpdate = z.infer<typeof CoverLetterUpdate>;

export const DocumentKind = z.enum(['resume', 'cover_letter']);
export type DocumentKind = z.infer<typeof DocumentKind>;

export const ExportFormat = z.enum(['pdf', 'docx']);
export type ExportFormat = z.infer<typeof ExportFormat>;

export const DocumentsBundle = z.object({
  resume: ResumeDraft.nullable(),
  coverLetter: CoverLetterDraft.nullable(),
});
export type DocumentsBundle = z.infer<typeof DocumentsBundle>;

export const ExportCheck = z.object({
  ok: z.boolean(),
  checked: z.array(z.string()),
  missing: z.array(z.string()),
  problems: z.array(z.string()),
});
export type ExportCheck = z.infer<typeof ExportCheck>;
