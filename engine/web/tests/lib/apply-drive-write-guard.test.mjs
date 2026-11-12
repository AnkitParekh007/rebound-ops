/**
 * apply-drive-write-guard.test.mjs: what the agentic drive loop may write into
 * a form (drive-write-guard.mjs, roadmap gap C3), on its own and through the
 * real executeAction + factsOf.
 *
 * Also run by the root `npm test` (roadmap gap C1).
 *
 * Run (from web/):  node --test tests/lib/apply-drive-write-guard.test.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { guardDriveWrite } from "../../src/lib/apply/drive-write-guard.mjs";
import { executeAction, factsOf } from "../../src/lib/apply/drive-action.mjs";

const FULL = {
  approved: [
    { label: "Full name", value: "Jane Smith" },
    { label: "Country", value: "Canada" },
    { label: "Will you require sponsorship to work in the United States?", value: "No" },
    { label: "Why Acme?", value: "Because the mission matches what I have built for years." },
  ],
};
const REACH = { approved: null };
const text = (label, extra = {}) => ({ tag: "input", type: "text", role: "input", aria: label, question: label, ...extra });
const radio = (option, question) => ({ tag: "input", type: "radio", role: "input", aria: option, question });

test("full mode: reviewed values go through, invented ones are held", () => {
  assert.equal(guardDriveWrite({ action: "type", text: "Jane Smith" }, text("Full name"), FULL), null);
  assert.equal(guardDriveWrite({ action: "type", text: "Jane" }, text("Full name"), FULL), null, "a prefix filters a combobox");
  assert.equal(guardDriveWrite({ action: "select", value: "Canada" }, { tag: "select", type: "", role: "select", aria: "Country", question: "Country" }, FULL), null);
  assert.deepEqual(guardDriveWrite({ action: "type", text: "Jane Q. Smith" }, text("Full name"), FULL), { refusal: "unreviewed-value", note: "not one of your reviewed answers" });
  assert.equal(guardDriveWrite({ action: "select", value: "Can" }, { tag: "select", type: "", role: "select", aria: "Country", question: "Country" }, FULL)?.refusal, "unreviewed-value", "select needs the whole value");
});

test("sensitive fields take only the reviewed answer to that same question", () => {
  const q = "Will you require sponsorship to work in the United States?";
  assert.equal(guardDriveWrite({ action: "click" }, radio("No", q), FULL), null);
  assert.equal(guardDriveWrite({ action: "click" }, radio("Yes", q), FULL)?.refusal, "sensitive-field", "other value");
  assert.equal(guardDriveWrite({ action: "click" }, radio("No", "Will you require sponsorship to work in Germany?"), FULL)?.refusal, "sensitive-field", "other question");
  assert.equal(guardDriveWrite({ action: "type", text: "No" }, text("Are you a protected veteran?"), FULL)?.refusal, "sensitive-field", "reviewed 'No' cannot move to another sensitive field");
  assert.equal(guardDriveWrite({ action: "type", text: "150000" }, text("Salary expectations"), FULL)?.refusal, "sensitive-field");
});

test("a consent checkbox is never ticked, even with a reviewed 'true'", () => {
  const policy = { approved: [{ label: "I agree to the privacy notice", value: "true" }] };
  const box = { tag: "input", type: "checkbox", role: "input", aria: "I agree to the privacy notice", question: "" };
  assert.deepEqual(guardDriveWrite({ action: "click" }, box, policy), { refusal: "sensitive-field", note: "agreement or consent: only you can accept this" });
});

test("a radio whose question is unknown is left for the person", () => {
  assert.equal(guardDriveWrite({ action: "click" }, radio("Yes", ""), FULL)?.refusal, "unknown-question");
});

test("reach mode: only the sensitive rule applies", () => {
  assert.equal(guardDriveWrite({ action: "type", text: "jane@example.com" }, text("Email to continue"), REACH), null);
  assert.equal(guardDriveWrite({ action: "type", text: "No" }, text("Do you require visa sponsorship?"), REACH)?.refusal, "sensitive-field");
});

test("navigation clicks and scrolls are not writes", () => {
  assert.equal(guardDriveWrite({ action: "click" }, { tag: "button", type: "button", role: "button", text: "Next", question: "" }, FULL), null);
  assert.equal(guardDriveWrite({ action: "scroll" }, null, FULL), null);
});

// ── Through the real executor ──

/** A minimal page whose controls answer the DOM calls factsOf makes. */
function page(elements) {
  const log = [];
  const handle = (el) => ({
    evaluate: async (fn, arg) => fn(el, arg),
    scrollIntoViewIfNeeded: async () => {},
    click: async () => void log.push(`click:${el.id}`),
    fill: async (t) => void log.push(`fill:${el.id}=${t}`),
    selectOption: async (o) => void log.push(`select:${el.id}=${typeof o === "string" ? o : o.label}`),
    dispose: async () => {},
  });
  const p = {
    log,
    keyboard: { insertText: async (t) => void log.push(`keyboard:${t}`) },
    waitForLoadState: async () => {},
    evaluate: async () => void log.push("scroll"),
    $: async (selector) => {
      const ref = /^\[data-co-ref="(.*)"\]$/.exec(selector)?.[1];
      const el = elements.find((e) => e.ref === ref);
      return el ? handle(el) : null;
    },
  };
  return p;
}

/** A fake control. `wrap` is the field wrapper closest() finds, with a heading. */
function control(id, { tag = "input", attrs = {}, text = "", labels = [], heading = "" }) {
  const wrap = heading ? { getAttribute: () => null, querySelector: () => ({ textContent: heading }) } : null;
  return {
    id,
    ref: `r-${id}`,
    tagName: tag.toUpperCase(),
    textContent: text,
    value: "",
    name: attrs.name ?? "",
    placeholder: attrs.placeholder ?? "",
    type: attrs.type ?? "",
    form: {},
    labels: labels.map((t) => ({ textContent: t })),
    getAttribute: (k) => (k === "data-co-ref" ? `r-${id}` : attrs[k] ?? null),
    closest: (sel) => (sel === "form" ? {} : wrap),
  };
}

test("factsOf reads a radio's question from its field wrapper", () => {
  const el = control("yes", { attrs: { type: "radio", "aria-label": "Yes" }, heading: "Do you require visa sponsorship?" });
  assert.equal(factsOf(el, "r-yes").question, "Do you require visa sponsorship?");
  const plain = control("name", { attrs: { type: "text" }, labels: ["Full name"] });
  assert.equal(factsOf(plain, "r-name").question, "Full name");
});

test("factsOf never fails on a control it cannot inspect", () => {
  const odd = control("odd", { attrs: { type: "radio" } });
  odd.closest = () => {
    throw new Error("detached");
  };
  assert.equal(factsOf(odd, "r-odd").question, "");
});

test("executeAction holds a sensitive write in full mode and does nothing to the page", async () => {
  const yes = control("yes", { attrs: { type: "radio", "aria-label": "Yes" }, heading: "Will you require sponsorship to work in the United States?" });
  const p = page([yes]);
  const out = await executeAction(p, p, { action: "click", ref: "r-yes" }, new Set(["r-yes"]), FULL);
  assert.equal(out.refusal, "sensitive-field");
  assert.deepEqual(p.log, []);
});

test("executeAction carries out a reviewed write", async () => {
  const no = control("no", { attrs: { type: "radio", "aria-label": "No" }, heading: "Will you require sponsorship to work in the United States?" });
  const name = control("name", { attrs: { type: "text" }, labels: ["Full name"] });
  const p = page([no, name]);
  assert.equal((await executeAction(p, p, { action: "click", ref: "r-no" }, new Set(["r-no", "r-name"]), FULL)).refusal, undefined);
  assert.equal((await executeAction(p, p, { action: "type", ref: "r-name", text: "Jane Smith" }, new Set(["r-no", "r-name"]), FULL)).refusal, undefined);
  assert.deepEqual(p.log, ["click:no", "fill:name=Jane Smith"]);
});

test("executeAction holds an invented value", async () => {
  const name = control("name", { attrs: { type: "text" }, labels: ["Full name"] });
  const p = page([name]);
  const out = await executeAction(p, p, { action: "type", ref: "r-name", text: "Someone Else" }, new Set(["r-name"]), FULL);
  assert.equal(out.refusal, "unreviewed-value");
  assert.deepEqual(p.log, []);
});
