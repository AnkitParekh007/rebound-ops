/**
 * submit-interlock.mjs — the page cannot submit the form while ReboundOps is
 * driving it (roadmap R3, work package AA-01).
 *
 * `submit-guard.mjs` stops the planner and the fill from clicking a control it
 * recognises as a submit control. What it cannot see is a control with no
 * submit wording or shape whose own JavaScript files the form, such as a
 * `<button type="button">Continue</button>` that calls `form.requestSubmit()`
 * or `form.submit()`. This interlock closes that gap at the event itself.
 *
 * How it works: an init script runs in every frame of the apply browser context
 * before the page's own scripts. While the hold is on it
 *   - cancels every `submit` event in the capture phase on `window`, before any
 *     page listener sees it (`requestSubmit()`, an Enter key in a field, a
 *     click on a submit button), and
 *   - turns `HTMLFormElement.prototype.submit()` into a no-op (that call fires
 *     no `submit` event, so the listener alone would miss it),
 * and counts each attempt it blocked.
 *
 * When the hold is on: from the moment the context is created, because the
 * window stays off-screen until the hand-off, so no person can be submitting.
 * `handoffSession` releases it in every frame before it shows the window, and
 * keeps releasing it in frames that load afterwards, so the person's own
 * Submit always works. A later fill or drive step holds it again.
 *
 * Not flag-gated: it only narrows what an automated session can do (ADR 0003,
 * decision 3), and it never runs in the person's own browser.
 *
 * What it does NOT stop: a page script that sends the application with
 * `fetch`/`XMLHttpRequest` from a click handler, with no form submission at
 * all. No event marks that request as "the application"; the planner and fill
 * still never click a control the submit guard refuses.
 *
 * Plain .mjs with no Playwright import, so `node --test` can pin it with fakes.
 */

/**
 * The script installed in every frame. Self-contained: Playwright serialises it
 * into the page, so it must not close over anything in this module.
 * Exported for tests.
 */
export function interlockInitScript() {
  const w = /** @type {any} */ (globalThis);
  if (w.__reboundopsSubmitInterlock) return;
  const state = { hold: true, blocked: 0 };
  Object.defineProperty(w, "__reboundopsSubmitInterlock", { value: state, enumerable: false, configurable: false, writable: false });
  w.addEventListener(
    "submit",
    (/** @type {Event} */ e) => {
      if (!state.hold) return;
      state.blocked += 1;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
  const Form = w.HTMLFormElement;
  if (Form && Form.prototype && typeof Form.prototype.submit === "function") {
    const nativeSubmit = Form.prototype.submit;
    Form.prototype.submit = function submit() {
      if (state.hold) {
        state.blocked += 1;
        return undefined;
      }
      return nativeSubmit.call(this);
    };
  }
}

/** Set the hold in one frame; returns how many submits it has blocked so far. Exported for tests. */
export function setHoldInFrame(hold) {
  const s = /** @type {any} */ (globalThis).__reboundopsSubmitInterlock;
  if (!s) return 0;
  s.hold = Boolean(hold);
  return s.blocked;
}

/** How many submits one frame has blocked. Exported for tests. */
export function blockedInFrame() {
  const s = /** @type {any} */ (globalThis).__reboundopsSubmitInterlock;
  return s ? s.blocked : 0;
}

/** Contexts whose hold has been released (the person has the window). */
const released = new WeakSet();
/** Pages already watched for new frames. */
const watched = new WeakSet();

/** @param {any} page */
function framesOf(page) {
  try {
    return typeof page.frames === "function" ? page.frames() : [];
  } catch {
    return [];
  }
}

/** @param {any} page @param {any} context */
function watchPage(page, context) {
  if (watched.has(page)) return;
  watched.add(page);
  // A frame that loads after the release starts held (the init script's
  // default), so release it again; the person must always be able to submit.
  page.on("framenavigated", (/** @type {any} */ frame) => {
    if (released.has(context)) frame.evaluate(setHoldInFrame, false).catch(() => {});
  });
}

/**
 * Install the interlock on an apply browser context, before its first page
 * opens. Every frame of every page starts with the hold on.
 * @param {any} context a Playwright BrowserContext
 */
export async function installSubmitInterlock(context) {
  await context.addInitScript(interlockInitScript);
  context.on("page", (/** @type {any} */ page) => watchPage(page, context));
  for (const page of context.pages()) watchPage(page, context);
}

/**
 * Turn the hold on or off in every frame of every page of the context.
 * Returns the total number of submits blocked so far.
 * @param {any} context a Playwright BrowserContext
 * @param {boolean} hold
 */
export async function setSubmitHold(context, hold) {
  if (hold) released.delete(context);
  else released.add(context);
  let blocked = 0;
  for (const page of context.pages()) {
    watchPage(page, context);
    for (const frame of framesOf(page)) {
      blocked += await frame.evaluate(setHoldInFrame, hold).catch(() => 0);
    }
  }
  return blocked;
}

/**
 * How many submits the interlock has blocked in the context's current frames.
 * @param {any} context a Playwright BrowserContext
 */
export async function blockedSubmits(context) {
  let blocked = 0;
  for (const page of context.pages()) {
    for (const frame of framesOf(page)) blocked += await frame.evaluate(blockedInFrame).catch(() => 0);
  }
  return blocked;
}

/** The issue a fill or drive reports when the page tried to submit and was stopped. */
export function submitBlockedIssue(count) {
  return {
    level: /** @type {const} */ ("warn"),
    code: "submit_blocked",
    message: `The page tried to submit the form ${count === 1 ? "once" : `${count} times`} while ReboundOps was filling it, and was stopped. Nothing was sent. Check every page of the form before you submit it yourself.`,
  };
}
