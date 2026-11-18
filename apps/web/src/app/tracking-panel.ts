import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Contact, DeletedItem, FollowUpDraft, FollowUpKind, Reminder, ReminderPriority } from '@reboundops/contracts';
import { ApiProblem, ApiService } from './api.service';

const today = () => new Date().toISOString().slice(0, 10);

/** Contacts, reminders and follow-up drafts. ReboundOps never sends messages. */
@Component({
  selector: 'app-tracking-panel',
  imports: [FormsModule],
  template: `
    <section class="card stack" aria-labelledby="track-heading">
      <h2 id="track-heading">Contacts and follow-ups</h2>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (lastDeleted(); as d) {
        <div class="undo-bar" role="status">
          <span>Deleted {{ d.kind }} “{{ d.label }}”.</span>
          <button type="button" class="btn ghost" (click)="undo()">Undo</button>
          <button type="button" class="btn link" (click)="lastDeleted.set(null)" aria-label="Dismiss">Dismiss</button>
        </div>
      }

      <h3 class="sub">Reminders</h3>
      <ul class="reminder-list">
        @for (r of reminders(); track r.id) {
          <li [class.done]="r.done" [class.overdue]="!r.done && r.dueOn < todayIso">
            <label class="check"><input type="checkbox" [checked]="r.done" (change)="toggle(r)" [name]="'rd' + r.id" /> {{ r.label }}</label>
            @if (r.priority === 'high') { <span class="badge warn small">High priority</span> }
            <span class="muted small">due {{ r.dueOn }}@if (!r.done && r.dueOn < todayIso) { · overdue }</span>
            <button type="button" class="btn link danger" (click)="removeReminder(r)" [attr.aria-label]="'Delete reminder ' + r.label">Delete</button>
          </li>
        } @empty { <li class="muted">No reminders.</li> }
      </ul>
      <form class="row" (ngSubmit)="addReminder()">
        <label class="sr-only" for="rlabel">Reminder</label>
        <input id="rlabel" name="rlabel" [(ngModel)]="reminderLabel" placeholder="e.g. Prepare for phone screen" />
        <label class="sr-only" for="rdue">Due date</label>
        <input id="rdue" name="rdue" type="date" [(ngModel)]="reminderDue" style="max-width: 11rem" />
        <label class="sr-only" for="rprio">Priority</label>
        <select id="rprio" name="rprio" [(ngModel)]="reminderPriority" style="max-width: 9rem">
          <option ngValue="high">High</option>
          <option ngValue="normal">Normal</option>
          <option ngValue="low">Low</option>
        </select>
        <button type="submit" class="btn ghost" [disabled]="!reminderLabel.trim() || !reminderDue">Add reminder</button>
      </form>

      <h3 class="sub">Contacts</h3>
      <ul class="criteria">
        @for (c of contacts(); track c.id) {
          <li>
            <div class="criterion-head"><span>{{ c.name }}@if (c.role) { <span class="muted"> · {{ c.role }}</span> }</span>
              <button type="button" class="btn link danger" (click)="removeContact(c)" [attr.aria-label]="'Delete contact ' + c.name">Delete</button></div>
            @if (c.email || c.phone) { <p class="small">{{ c.email }}@if (c.email && c.phone) { · }{{ c.phone }}</p> }
            @if (c.notes) { <p class="small">{{ c.notes }}</p> }
          </li>
        } @empty { <li class="muted">No contacts saved.</li> }
      </ul>
      <form class="stack subcard" (ngSubmit)="addContact()" aria-label="Add a contact">
        <div class="grid two">
          <div class="field"><label for="cname">Name</label><input id="cname" name="cname" [(ngModel)]="contact.name" /></div>
          <div class="field"><label for="crole">Role</label><input id="crole" name="crole" [(ngModel)]="contact.role" placeholder="Recruiter, hiring manager…" /></div>
          <div class="field"><label for="cemail">Email</label><input id="cemail" name="cemail" type="email" [(ngModel)]="contact.email" /></div>
          <div class="field"><label for="cphone">Phone</label><input id="cphone" name="cphone" [(ngModel)]="contact.phone" /></div>
        </div>
        <div class="field"><label for="cnotes">Notes</label><textarea id="cnotes" name="cnotes" rows="2" [(ngModel)]="contact.notes"></textarea></div>
        <div class="actions"><span class="spacer"></span><button type="submit" class="btn ghost" [disabled]="!contact.name.trim()">Save contact</button></div>
      </form>

      <h3 class="sub">Draft a follow-up</h3>
      <div class="row">
        <label class="sr-only" for="fkind">Message type</label>
        <select id="fkind" name="fkind" [(ngModel)]="kind" style="max-width: 16rem">
          <option ngValue="after_applying">Check in after applying</option>
          <option ngValue="after_interview">Check in after an interview</option>
          <option ngValue="thank_you">Thank-you note</option>
          <option ngValue="withdraw">Withdraw application</option>
        </select>
        <button type="button" class="btn ghost" (click)="draftFollowUp()">Draft</button>
      </div>
      @if (draft(); as d) {
        <div class="stack">
          <div class="field"><label for="fsub">Subject</label><input id="fsub" name="fsub" [(ngModel)]="d.subject" /></div>
          <div class="field"><label for="fbody">Message</label><textarea id="fbody" name="fbody" rows="9" [(ngModel)]="d.body"></textarea></div>
          @if (d.placeholders) { <p class="hint"><strong>Fill the [[placeholders]] before sending.</strong></p> }
          <div class="actions">
            <span class="muted small">ReboundOps does not send messages.</span>
            <span class="spacer"></span>
            <button type="button" class="btn ghost" (click)="copy(d)">Copy</button>
            @if (d.to) { <a class="btn ghost" [href]="mailto(d)">Open in my mail app</a> }
          </div>
          @if (copied()) { <p class="muted small" role="status">Copied to clipboard.</p> }
        </div>
      }
    </section>
  `,
})
export class TrackingPanel {
  private readonly api = inject(ApiService);
  readonly applicationId = input.required<string>();
  readonly contacts = signal<Contact[]>([]);
  readonly reminders = signal<Reminder[]>([]);
  readonly draft = signal<FollowUpDraft | null>(null);
  readonly error = signal<string | null>(null);
  readonly copied = signal(false);
  readonly todayIso = today();
  reminderLabel = '';
  reminderDue = '';
  reminderPriority: ReminderPriority = 'normal';
  /** The most recent deletion, offered for Undo (kept restorable on the server for 30 days). */
  readonly lastDeleted = signal<DeletedItem | null>(null);
  kind: FollowUpKind = 'after_applying';
  contact = { name: '', role: '', email: '', phone: '', notes: '' };

  constructor() {
    effect(() => {
      const id = this.applicationId();
      void this.safe(async () => {
        const [c, r] = await Promise.all([this.api.contacts(id), this.api.reminders(id)]);
        this.contacts.set(c);
        this.reminders.set(r);
      });
    });
  }

  /** Reload, e.g. after a status change that adds a reminder. */
  async refresh() {
    await this.safe(async () => this.reminders.set(await this.api.reminders(this.applicationId())));
  }

  private async safe(fn: () => Promise<void>) {
    this.error.set(null);
    try {
      await fn();
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Something went wrong.');
    }
  }

  addReminder() {
    return this.safe(async () => {
      const r = await this.api.addReminder(this.applicationId(), { label: this.reminderLabel.trim(), dueOn: this.reminderDue, priority: this.reminderPriority });
      this.reminders.update((l) => [...l, r].sort((a, b) => a.dueOn.localeCompare(b.dueOn)));
      this.reminderLabel = '';
    });
  }
  toggle(r: Reminder) {
    return this.safe(async () => {
      const next = await this.api.updateReminder(this.applicationId(), r.id, { done: !r.done });
      this.reminders.update((l) => l.map((x) => (x.id === r.id ? next : x)));
    });
  }
  removeReminder(r: Reminder) {
    return this.safe(async () => {
      this.lastDeleted.set(await this.api.deleteReminder(this.applicationId(), r.id));
      this.reminders.update((l) => l.filter((x) => x.id !== r.id));
    });
  }
  addContact() {
    return this.safe(async () => {
      const c = await this.api.saveContact(this.applicationId(), { ...this.contact, name: this.contact.name.trim(), email: this.contact.email.trim() });
      this.contacts.update((l) => [...l, c]);
      this.contact = { name: '', role: '', email: '', phone: '', notes: '' };
    });
  }
  removeContact(c: Contact) {
    return this.safe(async () => {
      this.lastDeleted.set(await this.api.deleteContact(this.applicationId(), c.id));
      this.contacts.update((l) => l.filter((x) => x.id !== c.id));
    });
  }
  undo() {
    const d = this.lastDeleted();
    if (!d) return Promise.resolve();
    return this.safe(async () => {
      if (d.kind === 'contact') {
        const c = await this.api.restoreContact(this.applicationId(), d.id);
        this.contacts.update((l) => [...l, c]);
      } else {
        const r = await this.api.restoreReminder(this.applicationId(), d.id);
        this.reminders.update((l) => [...l, r].sort((a, b) => a.dueOn.localeCompare(b.dueOn)));
      }
      this.lastDeleted.set(null);
    });
  }
  draftFollowUp() {
    return this.safe(async () => this.draft.set(structuredClone(await this.api.followUp(this.applicationId(), this.kind))));
  }
  mailto(d: FollowUpDraft) {
    return `mailto:${encodeURIComponent(d.to ?? '')}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;
  }
  async copy(d: FollowUpDraft) {
    try {
      await navigator.clipboard.writeText(`Subject: ${d.subject}\n\n${d.body}`);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    } catch {
      this.error.set('Copy failed — select the text and copy it manually.');
    }
  }
}
