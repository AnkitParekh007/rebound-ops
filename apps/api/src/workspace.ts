import { randomUUID } from 'node:crypto';
import {
  type ActivityEntry,
  type Application,
  type ApplicationView,
  type DashboardSummary,
  type ExportBundle,
  type Job,
  type JobCreateResult,
  type JobExtraction,
  type OnboardingState,
  type Profile,
  JobCreate,
  JobExtractRequest,
  NoteRequest,
  OnboardingUpdate,
  ProfileUpdate,
  StatusTransitionRequest,
} from '@reboundops/contracts';
import {
  allowedTransitions,
  checkTransition,
  defaultOnboarding,
  defaultProfile,
  mergeOnboarding,
  normalizeList,
  summarize,
} from '@reboundops/core';
import { checkGrounding, dedupeKey, extractJob, normalizeDescription } from '@reboundops/job-intelligence';
import type { Store } from '@reboundops/storage';
import { AppError, notFound } from './errors.ts';

export interface WorkspaceOptions {
  now?: () => Date;
  newId?: () => string;
}

/**
 * Application service: orchestrates domain rules (core, job-intelligence)
 * over persistence (storage). Inputs are `unknown` and validated here so
 * every caller — HTTP, CLI, tests — gets identical guarantees.
 */
export class Workspace {
  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly store: Store;

  constructor(store: Store, options: WorkspaceOptions = {}) {
    this.store = store;
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? randomUUID;
  }

  get schemaVersion(): number {
    return this.store.schemaVersion;
  }

  /* ---------- onboarding ---------- */

  getOnboarding(): OnboardingState {
    return this.store.getOnboarding() ?? defaultOnboarding();
  }

  updateOnboarding(input: unknown): OnboardingState {
    const update = OnboardingUpdate.parse(input);
    if (update.goals) update.goals.targetRoles = normalizeList(update.goals.targetRoles);
    return this.store.saveOnboarding(mergeOnboarding(this.getOnboarding(), update, this.now()));
  }

  /* ---------- profile ---------- */

  getProfile(): Profile {
    return this.store.getProfile() ?? defaultProfile();
  }

  saveProfile(input: unknown): Profile {
    const p = ProfileUpdate.parse(input);
    const seenIds = new Set<string>();
    for (const e of p.experience) {
      if (seenIds.has(e.id)) throw new AppError(422, 'invalid_profile', `Duplicate experience id ${e.id}.`);
      seenIds.add(e.id);
      if (e.end && e.end < e.start) {
        throw new AppError(422, 'invalid_profile', `Experience "${e.title}" ends before it starts.`);
      }
    }
    return this.store.saveProfile({
      ...p,
      targetRoles: normalizeList(p.targetRoles),
      preferredCountries: normalizeList(p.preferredCountries),
      workAuthorizedCountries: normalizeList(p.workAuthorizedCountries),
      skills: normalizeList(p.skills),
      workArrangements: [...new Set(p.workArrangements)],
      updatedAt: this.now().toISOString(),
    });
  }

  /* ---------- jobs ---------- */

  extractJob(input: unknown): JobExtraction {
    const req = JobExtractRequest.parse(input);
    if (!req.description.trim() && !req.sourceUrl) {
      throw new AppError(422, 'empty_job', 'Paste a job description or a job URL.');
    }
    return extractJob(req.description, req.sourceUrl);
  }

  createJob(input: unknown): JobCreateResult {
    const req = JobCreate.parse(input);
    const description = normalizeDescription(req.description);
    const candidate = { ...req, description };

    const problems = checkGrounding(candidate);
    if (problems.length) {
      throw new AppError(422, 'ungrounded_fields', 'Some extracted fields are not supported by the description.', problems);
    }

    const key = dedupeKey(candidate);
    const existing = this.store.findJobsByDedupeKey(key);
    if (existing.length && !req.allowDuplicate) {
      throw new AppError(409, 'duplicate_job', 'This job looks like one you already saved.', {
        existingJobIds: existing.map((j) => j.id),
      });
    }

    const at = this.now().toISOString();
    const job: Job = {
      id: this.newId(),
      title: req.title,
      employer: req.employer,
      location: req.location || null,
      salary: req.salary || null,
      workArrangement: req.workArrangement,
      sourceUrl: req.sourceUrl,
      description,
      provenance: req.provenance,
      verification: {
        status: 'unverified',
        checkedAt: null,
        note: 'Entered manually; not checked against the live posting.',
      },
      dedupeKey: key,
      capturedAt: at,
    };
    const app: Application = {
      id: this.newId(),
      jobId: job.id,
      status: 'discovered',
      createdAt: at,
      updatedAt: at,
      statusChangedAt: at,
      appliedConfirmedAt: null,
    };

    this.store.transaction(() => {
      this.store.insertJob(job);
      this.store.upsertApplication(app);
      this.store.addActivity(this.activity(app.id, 'created', null, 'discovered', 'Saved from manual job intake.', at));
    });
    return { job, application: this.getApplication(app.id) };
  }

  getJob(id: string): Job {
    return this.store.getJob(id) ?? (() => { throw notFound('Job'); })();
  }

  /* ---------- applications ---------- */

  listApplications(): ApplicationView[] {
    const jobs = new Map(this.store.listJobs().map((j) => [j.id, j]));
    const activity = new Map<string, ActivityEntry[]>();
    for (const entry of this.store.listActivity()) {
      const list = activity.get(entry.applicationId) ?? [];
      list.push(entry);
      activity.set(entry.applicationId, list);
    }
    return this.store.listApplications().flatMap((app) => {
      const job = jobs.get(app.jobId);
      return job
        ? [{ ...app, job, activity: activity.get(app.id) ?? [], allowedNext: [...allowedTransitions(app.status)] }]
        : [];
    });
  }

  getApplication(id: string): ApplicationView {
    const app = this.store.getApplication(id);
    if (!app) throw notFound('Application');
    const job = this.store.getJob(app.jobId);
    if (!job) throw notFound('Job');
    return { ...app, job, activity: this.store.listActivity(id), allowedNext: [...allowedTransitions(app.status)] };
  }

  transition(id: string, input: unknown): ApplicationView {
    const req = StatusTransitionRequest.parse(input);
    const app = this.store.getApplication(id);
    if (!app) throw notFound('Application');

    const check = checkTransition(app.status, req.to, req.confirmSubmitted);
    if (!check.ok) {
      const status = check.code === 'confirmation_required' ? 428 : 409;
      throw new AppError(status, check.code, check.message);
    }

    const at = this.now().toISOString();
    const next: Application = {
      ...app,
      status: req.to,
      updatedAt: at,
      statusChangedAt: at,
      appliedConfirmedAt: req.to === 'applied' ? at : app.appliedConfirmedAt,
    };
    const note =
      req.note || (req.to === 'applied' ? 'You confirmed you submitted this application.' : '');
    this.store.transaction(() => {
      this.store.upsertApplication(next);
      this.store.addActivity(this.activity(id, 'status_changed', app.status, req.to, note, at));
    });
    return this.getApplication(id);
  }

  addNote(id: string, input: unknown): ApplicationView {
    const { note } = NoteRequest.parse(input);
    const app = this.store.getApplication(id);
    if (!app) throw notFound('Application');
    const at = this.now().toISOString();
    this.store.transaction(() => {
      this.store.upsertApplication({ ...app, updatedAt: at });
      this.store.addActivity(this.activity(id, 'note', null, null, note, at));
    });
    return this.getApplication(id);
  }

  /* ---------- insight & export ---------- */

  dashboard(): DashboardSummary {
    return summarize(this.listApplications(), this.now());
  }

  exportAll(): ExportBundle {
    return {
      format: 'reboundops-export',
      formatVersion: 1,
      exportedAt: this.now().toISOString(),
      schemaVersion: this.store.schemaVersion,
      onboarding: this.getOnboarding(),
      profile: this.getProfile(),
      jobs: this.store.listJobs(),
      applications: this.store.listApplications(),
      activity: this.store.listActivity(),
    };
  }

  private activity(
    applicationId: string,
    kind: ActivityEntry['kind'],
    from: ActivityEntry['from'],
    to: ActivityEntry['to'],
    note: string,
    at: string,
  ): ActivityEntry {
    return { id: this.newId(), applicationId, at, kind, from, to, note };
  }
}
