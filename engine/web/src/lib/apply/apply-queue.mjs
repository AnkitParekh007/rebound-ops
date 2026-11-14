/**
 * apply-queue.mjs — the Controlled Auto Apply queue (roadmap R3, work package
 * AA-02, behind the `autoApply` flag).
 *
 * R3 is prepare-only (owner decision, 14 Nov 2026): this queue lists the
 * applications ReboundOps may prepare; the person reviews and submits every
 * one of them. Nothing here submits anything.
 *
 * Owner decisions, 14 Nov 2026:
 *   - qualifying tracker rows are added automatically (the person can remove
 *     any, and a removed row is never added back on its own);
 *   - at most APPLY_QUEUE_DAILY_CAP (10) applications are prepared per day;
 *   - a row needs a score of at least APPLY_QUEUE_MIN_SCORE (4.0/5).
 *
 * A tracker row qualifies when all of these hold, and the reasons are kept
 * on the item in plain words:
 *   - its status is Evaluated (not applied, closed or skipped yet);
 *   - its score is at least 4.0/5;
 *   - its posting URL is a Greenhouse or Lever job page (never LinkedIn or Indeed);
 *   - the eligibility screen of its archived posting is not `blocked`.
 * Whether the posting is still open is checked when it is prepared (AA-03),
 * because that needs a network request.
 *
 * Stored in <root>/data/apply-queue.json (git-ignored, like all of data/),
 * written owner-only and atomically under a lock, with a revision so two tabs
 * cannot overwrite each other. The vocabulary mirrors `@reboundops/contracts`
 * (`auto-apply.ts`); tests/operations-parity.test.mjs pins it.
 *
 * Dependency-light (node:fs, the shared lock, two URL parsers), so
 * `node --test` loads it.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { tryAcquireDirLockSync, releaseOrWarn } from "../core/dir-lock.mjs";
import { parseGreenhouse } from "./greenhouse-url.mjs";
import { parseLever } from "./lever.mjs";

export const APPLY_QUEUE_STATES = Object.freeze(["queued", "prepared", "stopped", "applied", "withdrawn", "removed"]);
export const APPLY_ADAPTERS = Object.freeze(["greenhouse", "lever"]);
export const APPLY_QUEUE_DAILY_CAP = 10;
export const APPLY_QUEUE_MIN_SCORE = 4.0;
export const AUTO_APPLY_FLAG = "autoApply";
export const FEATURE_FLAG_ENV = "REBOUNDOPS_FEATURES";
export const APPLY_QUEUE_FILE = path.join("data", "apply-queue.json");
export const MAX_QUEUE_ITEMS = 1000;
const LOCK_STALE_MS = 30_000;

/** @param {Record<string, string | undefined>} env */
export function autoApplyEnabled(env) {
  return String(env?.[FEATURE_FLAG_ENV] ?? "").split(",").some((name) => name.trim() === AUTO_APPLY_FLAG);
}

export class ApplyQueueError extends Error {
  /** @param {string} message @param {number} [status] */
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * @typedef {"queued" | "prepared" | "stopped" | "applied" | "withdrawn" | "removed"} QueueState
 * @typedef {{
 *   id: string, trackerNumber: string, company: string, role: string, url: string,
 *   adapter: "greenhouse" | "lever", score: number, state: QueueState,
 *   reasons: string[], blockers: string[], addedAt: string, updatedAt: string, preparedAt: string | null,
 * }} QueueItem
 * @typedef {{ version: 1, revision: number, items: QueueItem[] }} ApplyQueue
 * @typedef {{
 *   trackerNumber: string, company: string, role: string, status: string, score: string,
 *   postingUrl: string, eligibility: "blocked" | "needs_review" | "eligible" | "no_requirements" | "not_screened" | "unchecked",
 * }} QueueCandidate a tracker row with what the queue needs; the caller reads the files.
 *   `unchecked`: the caller did not screen it because a cheaper rule already
 *   fails (`passesCheapRules`); it adds no eligibility blocker of its own.
 */

/** "4.2/5", "4.2", "4,2 / 5" → 4.2; anything else → null. */
export function parseScore(raw) {
  const m = String(raw ?? "").trim().match(/^(\d(?:[.,]\d+)?)\s*(?:\/\s*5)?$/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : null;
}

const NEVER_HOSTS = /(^|\.)(linkedin\.com|indeed\.[a-z.]+)$/i;

/**
 * The adapter for a posting URL, or why there is none.
 * @param {string} url
 * @returns {{ adapter: "greenhouse" | "lever" } | { refused: string }}
 */
export function adapterFor(url) {
  let host = "";
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return { refused: "The posting URL is not a web page." };
    host = u.hostname;
  } catch {
    return { refused: "The tracker row has no posting URL." };
  }
  if (NEVER_HOSTS.test(host)) return { refused: "LinkedIn and Indeed applications are never prepared: their terms prohibit automation." };
  if (parseGreenhouse(url)) return { adapter: "greenhouse" };
  if (parseLever(url)) return { adapter: "lever" };
  return { refused: `Only Greenhouse and Lever job pages can be prepared (this one is on ${host}).` };
}

const APPLIED_OR_LATER = new Set(["applied", "responded", "assessment", "interview", "offer", "hired"]);
const CLOSED = new Set(["rejected", "discarded", "skip"]);
const statusKey = (s) => String(s ?? "").replace(/\*/g, "").trim().toLowerCase();

/**
 * Does one tracker row qualify? Pure.
 * @param {QueueCandidate} c
 * @returns {{ qualifies: true, adapter: "greenhouse" | "lever", score: number, reasons: string[] }
 *   | { qualifies: false, applied: boolean, blockers: string[] }}
 */
export function qualify(c) {
  const blockers = [];
  const status = statusKey(c.status);
  if (APPLIED_OR_LATER.has(status)) return { qualifies: false, applied: true, blockers: [`The tracker says ${c.status.trim()}.`] };
  if (CLOSED.has(status)) blockers.push(`The tracker says ${c.status.trim()}.`);
  else if (status !== "evaluated") blockers.push(`Only Evaluated rows qualify (this one is ${c.status.trim() || "blank"}).`);
  const score = parseScore(c.score);
  if (score === null) blockers.push("The row has no score.");
  else if (score < APPLY_QUEUE_MIN_SCORE) blockers.push(`Its score ${score}/5 is under ${APPLY_QUEUE_MIN_SCORE}/5.`);
  const target = adapterFor(c.postingUrl);
  if ("refused" in target) blockers.push(target.refused);
  if (c.eligibility === "blocked") blockers.push("The eligibility screen says your profile does not meet a stated requirement.");
  else if (c.eligibility === "not_screened") blockers.push("The posting could not be screened for eligibility (no archived posting in the report).");
  else if (c.eligibility === "unchecked" && blockers.length === 0 && score !== null && !("refused" in target)) blockers.push("Eligibility was not screened.");
  if (blockers.length > 0 || score === null || "refused" in target) return { qualifies: false, applied: false, blockers };
  const reasons = [
    "Evaluated in the tracker, not applied yet.",
    `Scored ${score}/5 (at least ${APPLY_QUEUE_MIN_SCORE}/5).`,
    `${target.adapter === "greenhouse" ? "Greenhouse" : "Lever"} application form.`,
    c.eligibility === "eligible"
      ? "Eligibility screen: your profile meets every requirement found."
      : c.eligibility === "needs_review"
        ? "Eligibility screen: some requirements are yours to check."
        : "Eligibility screen: no hard requirements found.",
  ];
  return { qualifies: true, adapter: target.adapter, score, reasons };
}

/**
 * Whether a row passes every rule that needs no file read (status, score,
 * adapter), so the caller screens eligibility only for those rows.
 * @param {Pick<QueueCandidate, "status" | "score" | "postingUrl">} c
 */
export function passesCheapRules(c) {
  const score = parseScore(c.score);
  return statusKey(c.status) === "evaluated" && score !== null && score >= APPLY_QUEUE_MIN_SCORE && "adapter" in adapterFor(c.postingUrl);
}

/** @param {string} root */
const fileOf = (root) => path.join(root, APPLY_QUEUE_FILE);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/** @param {unknown} v @returns {v is QueueItem} */
function isItem(v) {
  const r = /** @type {Record<string, unknown>} */ (v);
  return !!v && typeof r.id === "string" && typeof r.trackerNumber === "string" && typeof r.company === "string" &&
    typeof r.role === "string" && typeof r.url === "string" && APPLY_ADAPTERS.includes(/** @type {string} */ (r.adapter)) &&
    typeof r.score === "number" && APPLY_QUEUE_STATES.includes(/** @type {string} */ (r.state)) &&
    Array.isArray(r.reasons) && r.reasons.every((x) => typeof x === "string") &&
    Array.isArray(r.blockers) && r.blockers.every((x) => typeof x === "string") &&
    typeof r.addedAt === "string" && ISO.test(r.addedAt) && typeof r.updatedAt === "string" && ISO.test(r.updatedAt) &&
    (r.preparedAt === null || (typeof r.preparedAt === "string" && ISO.test(r.preparedAt)));
}

/**
 * The queue. A missing file is an empty queue; an unreadable or damaged one is
 * an error, so it is never silently overwritten.
 * @param {string} root
 * @returns {ApplyQueue}
 */
export function readQueue(root) {
  let text;
  try {
    text = fs.readFileSync(fileOf(root), "utf8");
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") return { version: 1, revision: 0, items: [] };
    throw new ApplyQueueError("The apply queue could not be read.", 500);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApplyQueueError(`${APPLY_QUEUE_FILE} is not valid JSON. Fix or move it; it was not changed.`, 500);
  }
  if (!parsed || parsed.version !== 1 || !Number.isSafeInteger(parsed.revision) || !Array.isArray(parsed.items) || !parsed.items.every(isItem)) {
    throw new ApplyQueueError(`${APPLY_QUEUE_FILE} has an unexpected shape. Fix or move it; it was not changed.`, 500);
  }
  return parsed;
}

/**
 * Change the queue under the lock. `revision` null means "whatever is
 * current" (the automatic sync); a number must match, or another tab won.
 * @param {string} root
 * @param {number | null} revision
 * @param {(items: QueueItem[]) => QueueItem[] | null} change null = nothing to write
 * @returns {ApplyQueue}
 */
function update(root, revision, change) {
  if (revision !== null && (!Number.isSafeInteger(revision) || revision < 0)) throw new ApplyQueueError("A revision is required.");
  const file = fileOf(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = tryAcquireDirLockSync(`${file}.lock`, { staleMs: LOCK_STALE_MS });
  if (!lock) throw new ApplyQueueError("The apply queue is busy; try again.", 409);
  try {
    const prior = readQueue(root);
    if (revision !== null && prior.revision !== revision) throw new ApplyQueueError("The apply queue changed in another tab. Reload it and try again.", 409);
    const items = change(prior.items.map((i) => ({ ...i })));
    if (items === null) return prior;
    if (items.length > MAX_QUEUE_ITEMS) throw new ApplyQueueError(`The apply queue holds at most ${MAX_QUEUE_ITEMS} items.`);
    const next = { version: /** @type {1} */ (1), revision: prior.revision + 1, items };
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600, flag: "wx" });
      fs.renameSync(temp, file);
      if (process.platform !== "win32") fs.chmodSync(file, 0o600);
    } finally {
      try { fs.unlinkSync(temp); } catch (err) { if (/** @type {NodeJS.ErrnoException} */ (err).code !== "ENOENT") throw err; }
    }
    return next;
  } finally {
    releaseOrWarn(lock);
  }
}

/** The item for a tracker row: same row number and same posting. */
const sameRow = (item, c) => item.trackerNumber === c.trackerNumber && item.url === c.postingUrl;

/**
 * Bring the queue up to date with the tracker. Pure: returns the new item
 * list, or null when nothing changed.
 *   - a qualifying row that is not in the queue is added as `queued`;
 *   - a row that applied (or got further) becomes `applied`;
 *   - a queued, prepared or stopped item whose row no longer qualifies, or is
 *     gone from the tracker, becomes `withdrawn` with the reasons;
 *   - a withdrawn item whose row qualifies again goes back to `queued`;
 *   - a removed item stays removed: only the person brings it back.
 * @param {QueueItem[]} items
 * @param {QueueCandidate[]} candidates
 * @param {Date} now
 * @returns {QueueItem[] | null}
 */
export function syncItems(items, candidates, now) {
  const stamp = now.toISOString();
  let changed = false;
  const out = items.map((i) => ({ ...i }));
  const set = (item, patch) => {
    Object.assign(item, patch, { updatedAt: stamp });
    changed = true;
  };
  for (const c of candidates) {
    const verdict = qualify(c);
    const item = out.find((i) => sameRow(i, c));
    if (!item) {
      if (!verdict.qualifies) continue;
      out.push({
        id: randomUUID(),
        trackerNumber: c.trackerNumber,
        company: String(c.company ?? "").slice(0, 300),
        role: String(c.role ?? "").slice(0, 300),
        url: c.postingUrl,
        adapter: verdict.adapter,
        score: verdict.score,
        state: "queued",
        reasons: verdict.reasons,
        blockers: [],
        addedAt: stamp,
        updatedAt: stamp,
        preparedAt: null,
      });
      changed = true;
      continue;
    }
    if (item.state === "removed" || item.state === "applied") continue;
    if (!verdict.qualifies && verdict.applied) set(item, { state: "applied", blockers: [] });
    else if (!verdict.qualifies && item.state !== "withdrawn") set(item, { state: "withdrawn", blockers: verdict.blockers });
    else if (verdict.qualifies && item.state === "withdrawn") set(item, { state: "queued", blockers: [], reasons: verdict.reasons, score: verdict.score, adapter: verdict.adapter });
  }
  for (const item of out) {
    if (["queued", "prepared", "stopped"].includes(item.state) && !candidates.some((c) => sameRow(item, c))) {
      set(item, { state: "withdrawn", blockers: ["The row is no longer in the tracker."] });
    }
  }
  return changed ? out : null;
}

/**
 * Read the queue and bring it up to date with the tracker (the automatic
 * add). Writes only when something changed.
 * @param {string} root
 * @param {QueueCandidate[]} candidates
 * @param {Date} [now]
 * @returns {ApplyQueue}
 */
export function syncQueue(root, candidates, now = new Date()) {
  return update(root, null, (items) => syncItems(items, candidates, now));
}

/**
 * The person removes an item (it is never added back automatically) or
 * restores a removed one (it returns as `queued`; the next sync re-checks it).
 * @param {string} root
 * @param {{ revision: number, id: string, action: "remove" | "restore", now?: Date }} input
 * @returns {ApplyQueue}
 */
export function changeItem(root, { revision, id, action, now = new Date() }) {
  if (typeof id !== "string" || !id) throw new ApplyQueueError("Which queue item?");
  if (action !== "remove" && action !== "restore") throw new ApplyQueueError("The action must be remove or restore.");
  return update(root, revision, (items) => {
    const item = items.find((i) => i.id === id);
    if (!item) throw new ApplyQueueError("That queue item no longer exists.", 404);
    if (action === "remove") {
      if (item.state === "applied") throw new ApplyQueueError("An applied item stays in the queue as a record.");
      Object.assign(item, { state: "removed", updatedAt: now.toISOString() });
    } else {
      if (item.state !== "removed") throw new ApplyQueueError("Only a removed item can be restored.");
      Object.assign(item, { state: "queued", blockers: [], updatedAt: now.toISOString() });
    }
    return items;
  });
}

/** The local calendar day of an ISO time, as YYYY-MM-DD. */
const localDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * How many more applications may be prepared today (local calendar day).
 * The prepare runner (AA-03) asks this before each one.
 * @param {ApplyQueue} queue
 * @param {Date} [now]
 * @param {number} [cap]
 */
export function preparesLeftToday(queue, now = new Date(), cap = APPLY_QUEUE_DAILY_CAP) {
  const today = localDay(now.toISOString());
  const used = queue.items.filter((i) => i.preparedAt !== null && localDay(i.preparedAt) === today).length;
  return Math.max(0, cap - used);
}
