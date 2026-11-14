// The submit interlock (AA-01): while ReboundOps drives a form, the page cannot
// submit it; at the hand-off the person's own Submit works again. These tests
// use fakes; apply-submit-interlock-chrome.test.mjs runs the same script in a
// real browser.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  interlockInitScript,
  setHoldInFrame,
  blockedInFrame,
  installSubmitInterlock,
  setSubmitHold,
  blockedSubmits,
  submitBlockedIssue,
} from "../../src/lib/apply/submit-interlock.mjs";

/** A tiny page: a window that dispatches submit events and a form whose methods behave like the DOM's. */
function fakeFrame() {
  const target = new EventTarget();
  const sent = [];
  const pageHeard = [];
  const sandbox = {
    addEventListener: (...a) => target.addEventListener(...a),
    dispatchEvent: (e) => target.dispatchEvent(e),
    Event,
  };
  sandbox.HTMLFormElement = class HTMLFormElement {
    constructor(name) {
      this.name = name;
    }
    // Native submit(): sends without firing a submit event.
    submit() {
      sent.push(`${this.name}:submit()`);
    }
    // requestSubmit(): fires a cancelable submit event, sends unless cancelled.
    requestSubmit() {
      const e = new Event("submit", { cancelable: true });
      sandbox.dispatchEvent(e);
      if (!e.defaultPrevented) sent.push(`${this.name}:requestSubmit()`);
    }
  };
  const ctx = vm.createContext(sandbox);
  // The page's own listener, registered after the init script like real page code.
  const run = (fn, arg) => vm.runInContext(`(${fn.toString()})(${JSON.stringify(arg)})`, ctx);
  return { ctx, sandbox, sent, pageHeard, run, form: () => vm.runInContext("new HTMLFormElement('apply')", ctx) };
}

test("while held, requestSubmit and submit() send nothing and are counted", () => {
  const f = fakeFrame();
  f.run(interlockInitScript);
  f.sandbox.addEventListener("submit", () => f.pageHeard.push("page listener"));
  const form = f.form();
  form.requestSubmit();
  form.submit();
  assert.deepEqual(f.sent, []);
  assert.deepEqual(f.pageHeard, [], "the page's own submit handler never runs");
  assert.equal(f.run(blockedInFrame), 2);
});

test("released, both work again and nothing more is counted; held again, blocked again", () => {
  const f = fakeFrame();
  f.run(interlockInitScript);
  assert.equal(f.run(setHoldInFrame, false), 0);
  const form = f.form();
  form.requestSubmit();
  form.submit();
  assert.deepEqual(f.sent, ["apply:requestSubmit()", "apply:submit()"]);
  assert.equal(f.run(blockedInFrame), 0);
  f.run(setHoldInFrame, true);
  form.submit();
  assert.equal(f.sent.length, 2);
  assert.equal(f.run(blockedInFrame), 1);
});

test("installing twice in a frame keeps one interlock, and a frame without it reports zero", () => {
  const f = fakeFrame();
  f.run(interlockInitScript);
  f.run(interlockInitScript);
  f.form().submit();
  assert.equal(f.run(blockedInFrame), 1, "one counter, not two wrappers");
  const bare = fakeFrame();
  assert.equal(bare.run(setHoldInFrame, false), 0);
  assert.equal(bare.run(blockedInFrame), 0);
});

/** A fake Playwright context whose frames run evaluate() in fake frames. */
function fakeContext() {
  const handlers = { page: [] };
  const pages = [];
  const initScripts = [];
  const makeFrame = () => {
    const ff = fakeFrame();
    for (const s of initScripts) ff.run(s);
    return { ff, evaluate: async (fn, arg) => ff.run(fn, arg) };
  };
  const ctx = {
    addInitScript: async (fn) => initScripts.push(fn),
    on: (ev, fn) => (handlers[ev] ||= []).push(fn),
    pages: () => pages,
    newPage() {
      const frameHandlers = [];
      const page = {
        _frames: [makeFrame()],
        frames: () => page._frames,
        on: (ev, fn) => ev === "framenavigated" && frameHandlers.push(fn),
        // A navigation replaces the frame and re-runs the init scripts, like a real load.
        navigate() {
          const fr = makeFrame();
          page._frames = [fr];
          for (const h of frameHandlers) h(fr);
          return fr;
        },
      };
      pages.push(page);
      for (const h of handlers.page) h(page);
      return page;
    },
  };
  return ctx;
}

test("installed on a context, every new page starts held; release and hold reach every frame", async () => {
  const ctx = fakeContext();
  await installSubmitInterlock(ctx);
  const page = ctx.newPage();
  page._frames[0].ff.form().submit();
  assert.equal(await blockedSubmits(ctx), 1);
  assert.equal(await setSubmitHold(ctx, false), 1, "returns the count so far");
  page._frames[0].ff.form().submit();
  assert.deepEqual(page._frames[0].ff.sent, ["apply:submit()"]);
  await setSubmitHold(ctx, true);
  page._frames[0].ff.form().submit();
  assert.equal(page._frames[0].ff.sent.length, 1);
  assert.equal(await blockedSubmits(ctx), 2);
});

test("after the release, a frame that loads later is released too, so the person can always submit", async () => {
  const ctx = fakeContext();
  await installSubmitInterlock(ctx);
  const page = ctx.newPage();
  await setSubmitHold(ctx, false);
  const next = page.navigate();
  await new Promise((r) => setImmediate(r));
  next.ff.form().submit();
  assert.deepEqual(next.ff.sent, ["apply:submit()"]);
  // Held again (a new fill), a frame that loads later stays held.
  await setSubmitHold(ctx, true);
  const third = page.navigate();
  await new Promise((r) => setImmediate(r));
  third.ff.form().submit();
  assert.deepEqual(third.ff.sent, []);
});

test("the blocked-submit issue is a warning that says nothing was sent", () => {
  assert.deepEqual(submitBlockedIssue(1), {
    level: "warn",
    code: "submit_blocked",
    message: "The page tried to submit the form once while ReboundOps was filling it, and was stopped. Nothing was sent. Check every page of the form before you submit it yourself.",
  });
  assert.match(submitBlockedIssue(3).message, /3 times/);
});
