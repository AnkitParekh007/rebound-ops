import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ExperienceEntry, Profile, SavedAnswer, TriState, WorkArrangement } from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';
import { joinList, newId, splitList } from '../labels';

interface ExperienceDraft extends Omit<ExperienceEntry, 'end'> {
  current: boolean;
  end: string;
}

@Component({
  selector: 'app-profile-page',
  imports: [FormsModule],
  template: `
    <section class="page" aria-labelledby="profile-heading">
      <header class="page-head">
        <div>
          <p class="eyebrow">Profile</p>
          <h1 id="profile-heading">Preferences and verified facts</h1>
          <p class="lede">Only what you enter here is used when assessing jobs or drafting answers. Mark experience as verified once you have checked it.</p>
        </div>
      </header>

      @if (loading()) {
        <p class="muted" role="status">Loading profile…</p>
      } @else {
        <form class="stack" (ngSubmit)="save()" #f="ngForm" novalidate>
          <fieldset class="card">
            <legend>About you</legend>
            <div class="grid two">
              <div class="field"><label for="name">Name</label><input id="name" name="name" [(ngModel)]="displayName" autocomplete="name" /></div>
              <div class="field"><label for="headline">Headline</label><input id="headline" name="headline" [(ngModel)]="headline" placeholder="e.g. Analyst moving into data engineering" /></div>
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
                <select id="relocate" name="relocate" [(ngModel)]="relocation">
                  @for (t of tri; track t.value) { <option [ngValue]="t.value">{{ t.label }}</option> }
                </select>
              </div>
              <div class="field">
                <label for="sponsor">Need visa sponsorship</label>
                <select id="sponsor" name="sponsor" [(ngModel)]="sponsorship">
                  @for (t of tri; track t.value) { <option [ngValue]="t.value">{{ t.label }}</option> }
                </select>
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
            <div class="field">
              <label for="skills">Skills you can evidence</label>
              <textarea id="skills" name="skills" rows="3" [(ngModel)]="skills" aria-describedby="comma-hint"></textarea>
            </div>
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
                <div class="field"><label [for]="'sum' + i">Summary</label><textarea [id]="'sum' + i" [name]="'sum' + i" rows="3" [(ngModel)]="e.summary"></textarea></div>
                <div class="row">
                  <label class="check"><input type="checkbox" [name]="'ver' + i" [(ngModel)]="e.verified" /> I have checked this entry is accurate</label>
                  <span class="spacer"></span>
                  <button type="button" class="btn link danger" (click)="removeExperience(i)">Remove</button>
                </div>
              </div>
            } @empty {
              <p class="muted">No experience added yet. Importing a resume arrives in a later step; you can add entries by hand now.</p>
            }
            <button type="button" class="btn ghost" (click)="addExperience()">Add experience</button>
          </fieldset>

          <fieldset class="card">
            <legend>Saved answers</legend>
            <p class="hint">Reusable answers to common application questions, written by you.</p>
            @for (a of answers(); track a.id; let i = $index) {
              <div class="subcard">
                <div class="field"><label [for]="'q' + i">Question</label><input [id]="'q' + i" [name]="'q' + i" [(ngModel)]="a.question" /></div>
                <div class="field"><label [for]="'a' + i">Answer</label><textarea [id]="'a' + i" [name]="'a' + i" rows="3" [(ngModel)]="a.answer"></textarea></div>
                <div class="row"><span class="spacer"></span><button type="button" class="btn link danger" (click)="removeAnswer(i)">Remove</button></div>
              </div>
            }
            <button type="button" class="btn ghost" (click)="addAnswer()">Add an answer</button>
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
  readonly answers = signal<SavedAnswer[]>([]);

  displayName = '';
  headline = '';
  roles = '';
  countries = '';
  authorized = '';
  skills = '';
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
    this.roles = joinList(p.targetRoles);
    this.countries = joinList(p.preferredCountries);
    this.authorized = joinList(p.workAuthorizedCountries);
    this.skills = joinList(p.skills);
    this.relocation = p.openToRelocation;
    this.sponsorship = p.requiresSponsorship;
    this.arrangements.set([...p.workArrangements]);
    this.experience.set(p.experience.map((e) => ({ ...e, current: e.end === null, end: e.end ?? '' })));
    this.answers.set(p.answers.map((a) => ({ ...a })));
  }

  toggleArrangement(value: WorkArrangement) {
    this.arrangements.update((list) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]));
  }

  addExperience() {
    this.experience.update((l) => [...l, { id: newId(), employer: '', title: '', start: '', end: '', current: false, summary: '', verified: false }]);
  }
  removeExperience(i: number) {
    this.experience.update((l) => l.filter((_, idx) => idx !== i));
  }
  addAnswer() {
    this.answers.update((l) => [...l, { id: newId(), question: '', answer: '' }]);
  }
  removeAnswer(i: number) {
    this.answers.update((l) => l.filter((_, idx) => idx !== i));
  }

  async save() {
    this.busy.set(true);
    this.error.set(null);
    this.status.set('');
    try {
      const saved = await this.api.saveProfile({
        displayName: this.displayName,
        headline: this.headline,
        targetRoles: splitList(this.roles),
        preferredCountries: splitList(this.countries),
        workAuthorizedCountries: splitList(this.authorized),
        skills: splitList(this.skills),
        openToRelocation: this.relocation,
        requiresSponsorship: this.sponsorship,
        workArrangements: this.arrangements(),
        experience: this.experience().map(({ current, end, ...e }) => ({ ...e, end: current || !end ? null : end })),
        answers: this.answers().filter((a) => a.question.trim()),
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
