import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  SeniorityLevel,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  Profile,
  ProfileLink,
  ResumeImportResult,
  SavedAnswer,
  TriState,
  WorkArrangement,
} from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';
import { joinList, newId, splitList } from '../labels';

interface ExperienceDraft extends Omit<ExperienceEntry, 'end' | 'highlights'> {
  current: boolean;
  end: string;
  highlightsText: string;
}
interface EducationDraft extends Omit<EducationEntry, 'start' | 'end'> {
  start: string;
  end: string;
}
interface CertificationDraft extends Omit<CertificationEntry, 'date'> {
  date: string;
}
interface Choice<T> {
  item: T;
  selected: boolean;
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

@Component({
  selector: 'app-profile-page',
  imports: [FormsModule],
  template: `
    <section class="page" aria-labelledby="profile-heading">
      <header class="page-head">
        <div>
          <p class="eyebrow">Profile</p>
          <h1 id="profile-heading">Preferences and verified facts</h1>
          <p class="lede">Only what you enter and confirm here is used when assessing jobs or drafting documents. Tick “verified” once you have checked an entry.</p>
        </div>
      </header>

      <section class="card stack" aria-labelledby="import-heading">
        <h2 id="import-heading">Import a master resume</h2>
        <p class="hint">Accepts .pdf (with selectable text), .docx, .txt or .md. Files are read on this computer; the original is stored privately here. Nothing is added to your profile until you review it.</p>
        <div class="grid two">
          <div class="field">
            <label for="resume-file">Resume file</label>
            <input id="resume-file" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" (change)="onFile($event)" />
          </div>
          <div class="field">
            <label for="resume-text">…or paste resume text</label>
            <textarea id="resume-text" name="resumeText" rows="3" [(ngModel)]="pasted"></textarea>
            <div class="actions"><span class="spacer"></span><button type="button" class="btn ghost" (click)="importPasted()" [disabled]="importing() || !pasted.trim()">Read pasted text</button></div>
          </div>
        </div>
        @if (importing()) { <p class="muted" role="status">Reading resume…</p> }
        @if (importError()) { <p class="error" role="alert">{{ importError() }}</p> }
        @if (manualFor(); as m) {
          <div class="subcard stack" aria-labelledby="manual-heading">
            <h3 id="manual-heading">Type or paste the text of {{ m.filename }}</h3>
            <p class="hint">The original file will still be kept privately. Only what you enter here is read.</p>
            <label class="sr-only" for="manual-text">Resume text</label>
            <textarea id="manual-text" name="manualText" rows="8" [(ngModel)]="manualText"></textarea>
            <div class="actions">
              <button type="button" class="btn link" (click)="manualFor.set(null)">Cancel</button>
              <span class="spacer"></span>
              <button type="button" class="btn" (click)="importManual()" [disabled]="importing() || !manualText.trim()">Read my text</button>
            </div>
          </div>
        }

        @if (review(); as r) {
          <div class="review stack" aria-labelledby="review-heading">
            <h3 id="review-heading">Review what was found in {{ r.file.filename }}</h3>
            <p class="extraction" [attr.data-confidence]="r.extraction.confidence">
              <strong>Extraction confidence: {{ r.extraction.confidence }}</strong>
              <span class="muted small"> · {{ extractionLabel(r.extraction.method) }}@if (r.extraction.pages) { · {{ r.extraction.pages }} page(s) }</span>
              @if (r.extraction.confidence !== 'high') { <br /><span class="small">Check every entry against your original before adding it.</span> }
            </p>
            <ul class="warnings">@for (w of r.warnings; track w) { <li>{{ w }}</li> }</ul>
            <fieldset class="subcard">
              <legend>Experience</legend>
              @for (p of reviewExperience(); track p.item.id) {
                <label class="check"><input type="checkbox" [(ngModel)]="p.selected" [name]="'rx' + p.item.id" /> {{ p.item.title }} — {{ p.item.employer }} ({{ p.item.start }} – {{ p.item.end ?? 'present' }}, {{ p.item.highlights.length }} highlights)</label>
              } @empty { <p class="muted">None found.</p> }
            </fieldset>
            <fieldset class="subcard">
              <legend>Education and certifications</legend>
              @for (p of reviewEducation(); track p.item.id) {
                <label class="check"><input type="checkbox" [(ngModel)]="p.selected" [name]="'re' + p.item.id" /> {{ p.item.qualification || 'Education' }} — {{ p.item.institution }}</label>
              }
              @for (p of reviewCerts(); track p.item.id) {
                <label class="check"><input type="checkbox" [(ngModel)]="p.selected" [name]="'rc' + p.item.id" /> {{ p.item.name }}@if (p.item.issuer) { — {{ p.item.issuer }} }</label>
              }
            </fieldset>
            <p class="small">Skills found: {{ r.proposal.skills.join(', ') || 'none' }}. Contact details fill only empty fields.</p>
            <div class="actions">
              <button type="button" class="btn ghost" (click)="review.set(null)">Discard</button>
              <span class="spacer"></span>
              <button type="button" class="btn primary" (click)="applyReview()">Add selected to profile</button>
            </div>
          </div>
        }
      </section>

      @if (loading()) {
        <p class="muted" role="status">Loading profile…</p>
      } @else {
        <form class="stack" (ngSubmit)="save()" novalidate>
          <fieldset class="card">
            <legend>About you</legend>
            <div class="grid two">
              <div class="field"><label for="name">Name</label><input id="name" name="name" [(ngModel)]="displayName" autocomplete="name" /></div>
              <div class="field"><label for="headline">Headline</label><input id="headline" name="headline" [(ngModel)]="headline" placeholder="e.g. Analyst moving into data engineering" /></div>
              <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" [(ngModel)]="email" autocomplete="email" /></div>
              <div class="field"><label for="phone">Phone</label><input id="phone" name="phone" type="tel" [(ngModel)]="phone" autocomplete="tel" /></div>
              <div class="field"><label for="location">Location</label><input id="location" name="location" [(ngModel)]="location" placeholder="City, Country" /></div>
            </div>
            <div class="field">
              <span class="label" id="links-label">Links</span>
              @for (l of links(); track $index; let i = $index) {
                <div class="row" role="group" [attr.aria-label]="'Link ' + (i + 1)">
                  <input [attr.aria-label]="'Link ' + (i + 1) + ' label'" [name]="'ll' + i" [(ngModel)]="l.label" placeholder="Label" style="max-width: 10rem" />
                  <input [attr.aria-label]="'Link ' + (i + 1) + ' URL'" [name]="'lu' + i" type="url" [(ngModel)]="l.url" placeholder="https://" />
                  <button type="button" class="btn link danger" (click)="removeAt(links, i)">Remove</button>
                </div>
              }
              <div><button type="button" class="btn ghost" (click)="links.update((x) => [...x, { label: '', url: '' }])">Add link</button></div>
            </div>
          </fieldset>

          <fieldset class="card">
            <legend>Search preferences</legend>
            <div class="grid two">
              <div class="field"><label for="roles">Target roles</label><input id="roles" name="roles" [(ngModel)]="roles" aria-describedby="comma-hint" /></div>
              <div class="field"><label for="countries">Preferred countries</label><input id="countries" name="countries" [(ngModel)]="countries" aria-describedby="comma-hint" /></div>
            </div>
            <p class="hint" id="comma-hint">Separate entries with commas.</p>
            <div class="field">
              <span class="label" id="arr-label">Work arrangement</span>
              <div class="inline-options" role="group" aria-labelledby="arr-label">
                @for (a of arrangementOptions; track a.value) {
                  <label class="check"><input type="checkbox" [checked]="arrangements().includes(a.value)" (change)="toggleArrangement(a.value)" /> {{ a.label }}</label>
                }
              </div>
            </div>
            <div class="grid two">
              <div class="field">
                <label for="relocate">Open to relocation</label>
                <select id="relocate" name="relocate" [(ngModel)]="relocation">@for (t of tri; track t.value) { <option [ngValue]="t.value">{{ t.label }}</option> }</select>
              </div>
              <div class="field">
                <label for="sponsor">Need visa sponsorship</label>
                <select id="sponsor" name="sponsor" [(ngModel)]="sponsorship">@for (t of tri; track t.value) { <option [ngValue]="t.value">{{ t.label }}</option> }</select>
              </div>
            </div>
            <div class="field">
              <label for="auth">Countries where you are already authorised to work</label>
              <input id="auth" name="auth" [(ngModel)]="authorized" aria-describedby="auth-hint" />
              <p class="hint" id="auth-hint">Leave blank if unsure — ReboundOps will treat eligibility as unconfirmed rather than guess.</p>
            </div>
          </fieldset>

          <fieldset class="card">
            <legend>Skills</legend>
            <div class="field"><label for="skills">Skills you can evidence</label><textarea id="skills" name="skills" rows="3" [(ngModel)]="skills" aria-describedby="comma-hint"></textarea></div>
            <div class="field">
              <label for="skill-years">Years with specific skills (optional)</label>
              <textarea id="skill-years" name="skillYears" rows="3" [(ngModel)]="skillYears" placeholder="TypeScript: 6&#10;PostgreSQL: 4" aria-describedby="skill-years-hint"></textarea>
              <p class="hint" id="skill-years-hint">One per line as “Skill: years”. Used only to compare with postings that ask for years with a skill. ReboundOps never works out these years for you.</p>
              @if (skillYearsError()) { <p class="error small" role="alert">{{ skillYearsError() }}</p> }
            </div>
          </fieldset>

          <fieldset class="card">
            <legend>Level and pay</legend>
            <div class="field">
              <span class="label" id="seniority-label">Seniority you are targeting</span>
              <div class="inline-options" role="group" aria-labelledby="seniority-label">
                @for (l of seniorityOptions; track l) {
                  <label class="check"><input type="checkbox" [checked]="seniority().includes(l)" (change)="toggleSeniority(l)" [name]="'sen-' + l" /> {{ l }}</label>
                }
              </div>
            </div>
            <div class="grid two">
              <div class="field"><label for="pay-min">Minimum pay you would accept</label><input id="pay-min" name="payMin" type="number" min="0" [(ngModel)]="payMinimum" /></div>
              <div class="field"><label for="pay-cur">Currency</label><input id="pay-cur" name="payCur" maxlength="3" [(ngModel)]="payCurrency" placeholder="EUR" /></div>
              <div class="field"><label for="pay-per">Per</label><select id="pay-per" name="payPer" [(ngModel)]="payPeriod"><option ngValue="year">year</option><option ngValue="month">month</option><option ngValue="hour">hour</option></select></div>
            </div>
            <p class="hint">Compared only with pay a posting publishes, in the same currency. Leave blank to skip.</p>
          </fieldset>

          <fieldset class="card">
            <legend>Experience</legend>
            @for (e of experience(); track e.id; let i = $index) {
              <div class="subcard" role="group" [attr.aria-label]="'Experience ' + (i + 1)">
                <div class="grid two">
                  <div class="field"><label [for]="'emp' + i">Employer</label><input [id]="'emp' + i" [name]="'emp' + i" [(ngModel)]="e.employer" required /></div>
                  <div class="field"><label [for]="'title' + i">Title</label><input [id]="'title' + i" [name]="'title' + i" [(ngModel)]="e.title" required /></div>
                  <div class="field"><label [for]="'start' + i">Start (YYYY-MM)</label><input [id]="'start' + i" [name]="'start' + i" type="month" [(ngModel)]="e.start" required /></div>
                  <div class="field">
                    <label [for]="'end' + i">End (YYYY-MM)</label>
                    <input [id]="'end' + i" [name]="'end' + i" type="month" [(ngModel)]="e.end" [disabled]="e.current" />
                    <label class="check"><input type="checkbox" [name]="'cur' + i" [(ngModel)]="e.current" /> Current role</label>
                  </div>
                </div>
                <div class="field"><label [for]="'sum' + i">Summary</label><textarea [id]="'sum' + i" [name]="'sum' + i" rows="2" [(ngModel)]="e.summary"></textarea></div>
                <div class="field"><label [for]="'hl' + i">Highlights (one per line)</label><textarea [id]="'hl' + i" [name]="'hl' + i" rows="4" [(ngModel)]="e.highlightsText"></textarea></div>
                <div class="row">
                  <label class="check"><input type="checkbox" [name]="'ver' + i" [(ngModel)]="e.verified" /> I have checked this entry is accurate</label>
                  <span class="spacer"></span>
                  <button type="button" class="btn link danger" (click)="removeAt(experience, i)">Remove</button>
                </div>
              </div>
            } @empty { <p class="muted">No experience yet. Import a resume above or add entries by hand.</p> }
            <button type="button" class="btn ghost" (click)="addExperience()">Add experience</button>
          </fieldset>

          <fieldset class="card">
            <legend>Education</legend>
            @for (e of education(); track e.id; let i = $index) {
              <div class="subcard" role="group" [attr.aria-label]="'Education ' + (i + 1)">
                <div class="grid two">
                  <div class="field"><label [for]="'inst' + i">Institution</label><input [id]="'inst' + i" [name]="'inst' + i" [(ngModel)]="e.institution" required /></div>
                  <div class="field"><label [for]="'qual' + i">Qualification</label><input [id]="'qual' + i" [name]="'qual' + i" [(ngModel)]="e.qualification" /></div>
                  <div class="field"><label [for]="'field' + i">Field of study</label><input [id]="'field' + i" [name]="'field' + i" [(ngModel)]="e.field" /></div>
                  <div class="field"><label [for]="'eend' + i">Completed (YYYY-MM)</label><input [id]="'eend' + i" [name]="'eend' + i" type="month" [(ngModel)]="e.end" /></div>
                </div>
                <div class="row">
                  <label class="check"><input type="checkbox" [name]="'ever' + i" [(ngModel)]="e.verified" /> Verified</label>
                  <span class="spacer"></span>
                  <button type="button" class="btn link danger" (click)="removeAt(education, i)">Remove</button>
                </div>
              </div>
            }
            <button type="button" class="btn ghost" (click)="education.update((l) => [...l, { id: newId(), institution: '', qualification: '', field: '', start: '', end: '', verified: false }])">Add education</button>
          </fieldset>

          <fieldset class="card">
            <legend>Certifications</legend>
            @for (c of certifications(); track c.id; let i = $index) {
              <div class="subcard" role="group" [attr.aria-label]="'Certification ' + (i + 1)">
                <div class="grid two">
                  <div class="field"><label [for]="'cn' + i">Name</label><input [id]="'cn' + i" [name]="'cn' + i" [(ngModel)]="c.name" required /></div>
                  <div class="field"><label [for]="'ci' + i">Issuer</label><input [id]="'ci' + i" [name]="'ci' + i" [(ngModel)]="c.issuer" /></div>
                  <div class="field"><label [for]="'cd' + i">Date (YYYY-MM)</label><input [id]="'cd' + i" [name]="'cd' + i" type="month" [(ngModel)]="c.date" /></div>
                </div>
                <div class="row">
                  <label class="check"><input type="checkbox" [name]="'cver' + i" [(ngModel)]="c.verified" /> Verified</label>
                  <span class="spacer"></span>
                  <button type="button" class="btn link danger" (click)="removeAt(certifications, i)">Remove</button>
                </div>
              </div>
            }
            <button type="button" class="btn ghost" (click)="certifications.update((l) => [...l, { id: newId(), name: '', issuer: '', date: '', verified: false }])">Add certification</button>
          </fieldset>

          <fieldset class="card">
            <legend>Saved answers</legend>
            <p class="hint">Reusable answers to common application questions, written by you.</p>
            @for (a of answers(); track a.id; let i = $index) {
              <div class="subcard">
                <div class="field"><label [for]="'q' + i">Question</label><input [id]="'q' + i" [name]="'q' + i" [(ngModel)]="a.question" /></div>
                <div class="field"><label [for]="'a' + i">Answer</label><textarea [id]="'a' + i" [name]="'a' + i" rows="3" [(ngModel)]="a.answer"></textarea></div>
                <div class="row"><span class="spacer"></span><button type="button" class="btn link danger" (click)="removeAt(answers, i)">Remove</button></div>
              </div>
            }
            <button type="button" class="btn ghost" (click)="answers.update((l) => [...l, { id: newId(), question: '', answer: '' }])">Add an answer</button>
          </fieldset>

          <div class="sticky-actions">
            <span role="status" class="muted">{{ status() }}</span>
            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            <span class="spacer"></span>
            <button type="submit" class="btn primary" [disabled]="busy()">Save profile</button>
          </div>
        </form>
      }
    </section>
  `,
})
export class ProfilePage {
  private readonly api = inject(ApiService);
  readonly newId = newId;

  readonly arrangementOptions: { value: WorkArrangement; label: string }[] = [
    { value: 'remote', label: 'Remote' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'onsite', label: 'On-site' },
  ];
  readonly tri: { value: TriState; label: string }[] = [
    { value: 'unknown', label: 'Prefer not to say / not sure' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = signal('');
  readonly arrangements = signal<WorkArrangement[]>([]);
  readonly experience = signal<ExperienceDraft[]>([]);
  readonly education = signal<EducationDraft[]>([]);
  readonly certifications = signal<CertificationDraft[]>([]);
  readonly links = signal<ProfileLink[]>([]);
  readonly answers = signal<SavedAnswer[]>([]);

  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);
  readonly review = signal<ResumeImportResult | null>(null);
  readonly reviewExperience = signal<Choice<ExperienceEntry>[]>([]);
  readonly reviewEducation = signal<Choice<EducationEntry>[]>([]);
  readonly reviewCerts = signal<Choice<CertificationEntry>[]>([]);

  displayName = '';
  headline = '';
  email = '';
  phone = '';
  location = '';
  roles = '';
  countries = '';
  authorized = '';
  skills = '';
  skillYears = '';
  readonly skillYearsError = signal<string | null>(null);
  readonly seniorityOptions: SeniorityLevel[] = ['intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'manager', 'director', 'executive'];
  readonly seniority = signal<SeniorityLevel[]>([]);
  payMinimum: number | null = null;
  payCurrency = '';
  payPeriod: 'year' | 'month' | 'hour' = 'year';
  pasted = '';
  relocation: TriState = 'unknown';
  sponsorship: TriState = 'unknown';

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      this.fill(await this.api.profile());
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not load your profile.');
    } finally {
      this.loading.set(false);
    }
  }

  private fill(p: Profile) {
    this.displayName = p.displayName;
    this.headline = p.headline;
    this.email = p.contact.email;
    this.phone = p.contact.phone;
    this.location = p.contact.location;
    this.links.set(p.contact.links.map((l) => ({ ...l })));
    this.roles = joinList(p.targetRoles);
    this.countries = joinList(p.preferredCountries);
    this.authorized = joinList(p.workAuthorizedCountries);
    this.skills = joinList(p.skills);
    this.skillYears = p.skillExperience.map((x) => `${x.skill}: ${x.years}`).join('\n');
    this.seniority.set([...p.seniorityLevels]);
    this.payMinimum = p.salaryExpectation?.minimum ?? null;
    this.payCurrency = p.salaryExpectation?.currency ?? '';
    this.payPeriod = p.salaryExpectation?.period ?? 'year';
    this.relocation = p.openToRelocation;
    this.sponsorship = p.requiresSponsorship;
    this.arrangements.set([...p.workArrangements]);
    this.experience.set(p.experience.map((e) => this.toExpDraft(e)));
    this.education.set(p.education.map((e) => ({ ...e, start: e.start ?? '', end: e.end ?? '' })));
    this.certifications.set(p.certifications.map((c) => ({ ...c, date: c.date ?? '' })));
    this.answers.set(p.answers.map((a) => ({ ...a })));
  }

  private toExpDraft(e: ExperienceEntry): ExperienceDraft {
    const { highlights, end, ...rest } = e;
    return { ...rest, current: end === null, end: end ?? '', highlightsText: highlights.join('\n') };
  }

  removeAt<T>(list: { update(fn: (l: T[]) => T[]): void }, i: number) {
    list.update((l) => l.filter((_, idx) => idx !== i));
  }

  toggleArrangement(value: WorkArrangement) {
    this.arrangements.update((list) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]));
  }

  addExperience() {
    this.experience.update((l) => [...l, { id: newId(), employer: '', title: '', start: '', end: '', current: false, summary: '', highlightsText: '', verified: false }]);
  }

  /* ---------- import ---------- */

  async onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.importError.set('Resume files must be 5 MB or smaller.');
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const req = { filename: file.name, contentBase64: btoa(binary) };
    await this.runImport(req);
    input.value = '';
  }

  /** Offered when a file's text cannot be extracted (scanned, protected or unreadable PDF). */
  readonly manualFor = signal<{ filename: string; contentBase64: string } | null>(null);
  manualText = '';

  importManual() {
    const m = this.manualFor();
    if (!m) return;
    void this.runImport({ ...m, manualText: this.manualText });
  }

  extractionLabel(method: string): string {
    return ({ pdf_text: 'text read from PDF', docx: 'read from Word document', text: 'plain text file', pasted: 'pasted text', manual_entry: 'text you entered' } as Record<string, string>)[method] ?? method;
  }

  importPasted() {
    void this.runImport({ text: this.pasted });
  }

  private async runImport(req: { filename: string; contentBase64: string; manualText?: string } | { text: string }) {
    this.importing.set(true);
    this.importError.set(null);
    try {
      const r = await this.api.importResume(req);
      this.manualFor.set(null);
      this.manualText = '';
      this.review.set(r);
      this.reviewExperience.set(r.proposal.experience.map((item) => ({ item, selected: !this.hasExperience(item) })));
      this.reviewEducation.set(r.proposal.education.map((item) => ({ item, selected: !this.education().some((e) => sameText(e.institution, item.institution)) })));
      this.reviewCerts.set(r.proposal.certifications.map((item) => ({ item, selected: !this.certifications().some((c) => sameText(c.name, item.name)) })));
    } catch (e) {
      this.importError.set(e instanceof ApiProblem ? e.message : 'Could not read the resume.');
      // A scanned or unreadable PDF: offer manual entry while keeping the original.
      if (e instanceof ApiProblem && /^pdf_(scanned|unsupported|encrypted|corrupt)$/.test(e.code) && 'contentBase64' in req) {
        this.manualFor.set({ filename: req.filename, contentBase64: req.contentBase64 });
      }
    } finally {
      this.importing.set(false);
    }
  }

  private hasExperience(item: ExperienceEntry) {
    return this.experience().some((e) => sameText(e.employer, item.employer) && sameText(e.title, item.title) && e.start === item.start);
  }

  /** Merges selected facts as unverified entries. Existing data is never overwritten. */
  applyReview() {
    const r = this.review();
    if (!r) return;
    const p = r.proposal;
    if (!this.displayName) this.displayName = p.displayName;
    if (!this.headline) this.headline = p.headline;
    if (!this.email) this.email = p.contact.email;
    if (!this.phone) this.phone = p.contact.phone;
    if (!this.location) this.location = p.contact.location;
    const haveUrls = new Set(this.links().map((l) => l.url));
    this.links.update((l) => [...l, ...p.contact.links.filter((x) => !haveUrls.has(x.url))]);
    this.skills = joinList([...new Set([...splitList(this.skills), ...p.skills])]);
    this.experience.update((l) => [...l, ...this.reviewExperience().filter((x) => x.selected).map((x) => this.toExpDraft({ ...x.item, verified: false }))]);
    this.education.update((l) => [...l, ...this.reviewEducation().filter((x) => x.selected).map((x) => ({ ...x.item, verified: false, start: x.item.start ?? '', end: x.item.end ?? '' }))]);
    this.certifications.update((l) => [...l, ...this.reviewCerts().filter((x) => x.selected).map((x) => ({ ...x.item, verified: false, date: x.item.date ?? '' }))]);
    this.review.set(null);
    this.status.set('Imported entries added below as unverified. Review them, tick “verified”, then save.');
  }

  /* ---------- save ---------- */

  toggleSeniority(l: SeniorityLevel) {
    this.seniority.update((list) => (list.includes(l) ? list.filter((x) => x !== l) : [...list, l]));
  }

  /** "Skill: years" lines → entries. Returns null (and shows why) on an unreadable line. */
  parseSkillYears(): { skill: string; years: number }[] | null {
    const out: { skill: string; years: number }[] = [];
    for (const raw of this.skillYears.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const m = /^(.+?)\s*[:=\-–]\s*(\d+(?:\.\d+)?)\s*(?:y(?:ea)?rs?)?$/i.exec(line);
      if (!m) {
        this.skillYearsError.set(`Could not read “${line}”. Use “Skill: years”, for example “Python: 5”.`);
        return null;
      }
      out.push({ skill: m[1]!.trim(), years: Number(m[2]) });
    }
    this.skillYearsError.set(null);
    return out;
  }

  async save() {
    const skillExperience = this.parseSkillYears();
    if (!skillExperience) return;
    const cur = this.payCurrency.trim().toUpperCase();
    if (this.payMinimum !== null && this.payMinimum > 0 && !/^[A-Z]{3}$/.test(cur)) {
      this.error.set('Enter the pay currency as a three-letter code, for example EUR or USD.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.status.set('');
    try {
      const saved = await this.api.saveProfile({
        displayName: this.displayName,
        headline: this.headline,
        contact: { email: this.email.trim(), phone: this.phone, location: this.location, links: this.links().filter((l) => l.url.trim()) },
        targetRoles: splitList(this.roles),
        preferredCountries: splitList(this.countries),
        workAuthorizedCountries: splitList(this.authorized),
        skills: splitList(this.skills),
        openToRelocation: this.relocation,
        requiresSponsorship: this.sponsorship,
        workArrangements: this.arrangements(),
        experience: this.experience().map(({ current, end, highlightsText, ...e }) => ({
          ...e,
          end: current || !end ? null : end,
          highlights: highlightsText.split('\n').map((h) => h.replace(/^\s*[•\-*]\s*/, '').trim()).filter(Boolean),
        })),
        education: this.education().map((e) => ({ ...e, start: e.start || null, end: e.end || null })),
        certifications: this.certifications().map((c) => ({ ...c, date: c.date || null })),
        answers: this.answers().filter((a) => a.question.trim()),
        skillExperience,
        seniorityLevels: this.seniority(),
        salaryExpectation: this.payMinimum !== null && this.payMinimum > 0 ? { minimum: this.payMinimum, currency: cur, period: this.payPeriod } : null,
      });
      this.fill(saved);
      this.status.set('Profile saved.');
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? this.describe(e) : 'Could not save your profile.');
    } finally {
      this.busy.set(false);
    }
  }

  private describe(e: ApiProblem): string {
    if (e.code === 'invalid_request' && Array.isArray(e.details) && e.details.length) {
      const first = e.details[0] as { path: string; message: string };
      return `Please check ${first.path.replace(/\./g, ' › ')}: ${first.message}`;
    }
    return e.message;
  }
}
