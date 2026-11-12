/**
 * apply-answer-note.test.mjs: the per-field explanation on the apply review
 * screen (answer-note.mjs) and the wiring that carries the answer-policy
 * labels from the prefill stream to that screen.
 *
 * Also run by the root `npm test` (roadmap gap C1).
 *
 * Run (from web/):  node --test tests/lib/apply-answer-note.test.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";
import { answerNote } from "../../src/lib/apply/answer-note.mjs";
import { enforceAnswerPolicy, sensitiveCategory } from "../../src/lib/apply/answer-policy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(join(root, p), "utf8");

/** The provider's mapping from a policy answer to UI meta, restated. */
const toMeta = (a) => ({ needsConfirmation: a.needs_confirmation, source: a.source, holdReason: a.hold_reason, sensitiveCategory: a.sensitive_category });

test("a sensitive question tells the person why the AI left it blank", () => {
  const note = answerNote({ source: "unresolved", holdReason: "sensitive_requires_reviewed_fact", sensitiveCategory: "sponsorship" });
  assert.equal(note.tone, "held");
  assert.match(note.text, /visa sponsorship/);
  assert.match(note.text, /never allowed to answer/);
});

test("every hold reason the policy can emit has its own explanation", () => {
  const fields = [
    { id: "visa", type: "text", label: "Do you require sponsorship?", required: true },
    { id: "ok", type: "checkbox", label: "I agree to the terms of use", required: true },
    { id: "country", type: "select", label: "Country", required: true, options: ["Austria"] },
    { id: "sum", type: "textarea", label: "Summary", required: false, maxLength: 5 },
    { id: "phone", type: "text", label: "Phone", required: true },
  ];
  const { answers } = enforceAnswerPolicy(fields, { visa: "No", ok: "true", country: "US", sum: "too long", phone: "" });
  const texts = new Set();
  for (const f of fields) {
    const note = answerNote(toMeta(answers[f.id]), f);
    assert.ok(note, `${f.id} has a note`);
    assert.equal(note.tone, "held", f.id);
    texts.add(note.text);
  }
  assert.equal(texts.size, fields.length, "no two hold reasons share wording");
  assert.match(answerNote(toMeta(answers.sum), fields[3]).text, /5 characters/);
});

test("an AI draft is labelled as one; an optional blank field says nothing", () => {
  assert.equal(answerNote({ source: "model_draft", holdReason: null }).tone, "draft");
  assert.match(answerNote({ source: "model_draft", holdReason: null }).text, /AI draft/);
  assert.equal(answerNote({ source: "unresolved", holdReason: null }), null);
  assert.equal(answerNote(undefined), null);
});

test("once the person edits a field it is no longer called an AI draft", () => {
  const note = answerNote({ source: "model_draft", holdReason: null, edited: true });
  assert.deepEqual(note, { tone: "yours", text: "Edited by you." });
  assert.equal(answerNote({ source: "unresolved", holdReason: "sensitive_requires_reviewed_fact", sensitiveCategory: "salary", edited: true }).tone, "yours");
});

test("a value the chat assistant wrote is an AI draft, not the person's edit", () => {
  assert.deepEqual(answerNote({ source: "model_draft", edited: false, assisted: true }), { tone: "draft", text: "Written by the assistant. Check it before filling." });
  const sensitive = answerNote({ source: "unresolved", holdReason: "sensitive_requires_reviewed_fact", sensitiveCategory: "sponsorship", assisted: true });
  assert.equal(sensitive.tone, "held");
  assert.match(sensitive.text, /visa sponsorship/);
  assert.equal(answerNote({ source: "model_draft", edited: true, assisted: false }).tone, "yours");
});

test("only the review control marks an edit as the person's; the assistant path says so", () => {
  const provider = read("src/components/apply/apply-provider.tsx");
  assert.match(provider, /by: "you" \| "assistant" = "you"/);
  assert.match(provider, /by === "you"\s*\? \{ \.\.\.prev\[f\.id\], edited: true, assisted: false \}/);
  // The category is computed from the field, so an assistant answer written
  // before any prefill (empty meta) still gets the sensitive-question note.
  assert.match(provider, /assisted: true, needsConfirmation: true, sensitiveCategory: sensitiveCategory\(f\.label\)/);
  assert.match(provider, /import \{ sensitiveCategory \} from "@\/lib\/apply\/answer-policy\.mjs"/);
  assert.match(read("src/components/assistant-console.tsx"), /setAnswer\(idOrLabel, value, "assistant"\)/);
  assert.match(read("src/components/apply-view.tsx"), /onChange=\{\(v\) => a\.setAnswer\(f\.id, v\)\}/);
});

test("an assistant answer on a sensitive question is held even without a prefill", () => {
  // What setAnswer now records when the assistant writes into an empty meta.
  const meta = { edited: false, assisted: true, needsConfirmation: true, sensitiveCategory: sensitiveCategory("Do you require sponsorship?") };
  const note = answerNote(meta);
  assert.equal(note.tone, "held");
  assert.match(note.text, /visa sponsorship/);
});

test("the provider keeps the policy labels and marks edits", () => {
  const provider = read("src/components/apply/apply-provider.tsx");
  assert.match(provider, /source: v\?\.source/);
  assert.match(provider, /holdReason: v\?\.hold_reason/);
  assert.match(provider, /sensitiveCategory: v\?\.sensitive_category/);
  assert.match(provider, /edited: true/);
});

test("the review screen renders the note and links it to the control", () => {
  const view = read("src/components/apply-view.tsx");
  assert.match(view, /note=\{answerNote\(a\.meta\[f\.id\], f\)\}/);
  assert.match(view, /id=\{noteId\}/);
  assert.match(view, /"aria-describedby": describedBy \|\| undefined/);
});
