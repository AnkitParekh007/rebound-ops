// The Controlled Auto Apply queue (R3 AA-02): which tracker rows qualify, how
// the queue follows the tracker, the stored file and the daily cap. Fictional
// rows only; the queue file lives in a temporary directory.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  adapterFor,
  APPLY_QUEUE_DAILY_CAP,
  APPLY_QUEUE_FILE,
  APPLY_QUEUE_MIN_SCORE,
  autoApplyEnabled,
  changeItem,
  parseScore,
  passesCheapRules,
  preparesLeftToday,
  qualify,
  readQueue,
  syncItems,
  syncQueue,
} from "../../src/lib/apply/apply-queue.mjs";

const GH = "https://job-boards.greenhouse.io/fictionalco/jobs/1234567";
const LEVER = "https://jobs.lever.co/fictionalco/0f6a4a8e-1c2b-4d3e-9f00-112233445566";
const NOW = new Date("2026-11-14T10:00:00Z");
const row = (over = {}) => ({
  trackerNumber: "21",
  company: "Fictional Co",
  role: "Data Engineer",
  status: "Evaluated",
  score: "4.3/5",
  postingUrl: GH,
  eligibility: "eligible",
  ...over,
});
const tmpRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "apply-queue-"));

test("the flag, the cap and the minimum score are the owner's choices", () => {
  assert.equal(autoApplyEnabled({ REBOUNDOPS_FEATURES: "autofill, autoApply" }), true);
  assert.equal(autoApplyEnabled({ REBOUNDOPS_FEATURES: "autoapply" }), false, "case-sensitive like every flag");
  assert.equal(autoApplyEnabled({}), false);
  assert.equal(APPLY_QUEUE_DAILY_CAP, 10);
  assert.equal(APPLY_QUEUE_MIN_SCORE, 4.0);
});

test("scores read as tracker writes them", () => {
  assert.equal(parseScore("4.3/5"), 4.3);
  assert.equal(parseScore("4,5 / 5"), 4.5);
  assert.equal(parseScore("4"), 4);
  for (const bad of ["N/A", "—", "", "6/5", "4.3/10", "about 4"]) assert.equal(parseScore(bad), null, bad);
});

test("only Greenhouse and Lever job pages have an adapter; LinkedIn and Indeed never do", () => {
  assert.deepEqual(adapterFor(GH), { adapter: "greenhouse" });
  assert.deepEqual(adapterFor("https://boards.greenhouse.io/embed/job_app?for=fictionalco&token=1234567"), { adapter: "greenhouse" });
  assert.deepEqual(adapterFor(LEVER), { adapter: "lever" });
  assert.match(adapterFor("https://www.linkedin.com/jobs/view/123").refused, /LinkedIn and Indeed/);
  assert.match(adapterFor("https://uk.indeed.com/viewjob?jk=abc").refused, /LinkedIn and Indeed/);
  assert.match(adapterFor("https://www.indeed.co.uk/viewjob?jk=abc").refused, /LinkedIn and Indeed/);
  assert.match(adapterFor("https://jobs.ashbyhq.com/fictionalco/abc").refused, /Only Greenhouse and Lever.*jobs\.ashbyhq\.com/);
  assert.match(adapterFor("").refused, /no posting URL/);
  assert.match(adapterFor("mailto:jobs@example.invalid").refused, /not a web page/);
});

test("a qualifying row says why in plain words", () => {
  const v = qualify(row());
  assert.equal(v.qualifies, true);
  assert.equal(v.adapter, "greenhouse");
  assert.equal(v.score, 4.3);
  assert.deepEqual(v.reasons, [
    "Evaluated in the tracker, not applied yet.",
    "Scored 4.3/5 (at least 4/5).",
    "Greenhouse application form.",
    "Eligibility screen: your profile meets every requirement found.",
  ]);
  assert.match(qualify(row({ eligibility: "needs_review" })).reasons[3], /yours to check/);
  assert.match(qualify(row({ eligibility: "no_requirements", postingUrl: LEVER })).reasons.join(" "), /Lever.*no hard requirements/);
});

test("each rule that fails is named, and an applied row is marked applied", () => {
  assert.deepEqual(qualify(row({ score: "3.9/5" })).blockers, ["Its score 3.9/5 is under 4/5."]);
  assert.deepEqual(qualify(row({ score: "N/A" })).blockers, ["The row has no score."]);
  assert.deepEqual(qualify(row({ status: "Discarded" })).blockers, ["The tracker says Discarded."]);
  assert.deepEqual(qualify(row({ status: "Pending" })).blockers, ["Only Evaluated rows qualify (this one is Pending)."]);
  assert.match(qualify(row({ eligibility: "blocked" })).blockers[0], /does not meet a stated requirement/);
  assert.match(qualify(row({ eligibility: "not_screened" })).blockers[0], /could not be screened/);
  assert.match(qualify(row({ postingUrl: "https://www.linkedin.com/jobs/view/1" })).blockers[0], /LinkedIn/);
  const two = qualify(row({ score: "3/5", status: "SKIP" }));
  assert.equal(two.blockers.length, 2);
  for (const status of ["Applied", "Interview", "**Offer**", "hired"]) {
    const v = qualify(row({ status }));
    assert.equal(v.qualifies, false);
    assert.equal(v.applied, true, status);
  }
});

test("eligibility is screened only for rows that pass the cheap rules", () => {
  assert.equal(passesCheapRules(row()), true);
  assert.equal(passesCheapRules(row({ score: "3.5/5" })), false);
  assert.equal(passesCheapRules(row({ status: "Applied" })), false);
  assert.equal(passesCheapRules(row({ postingUrl: "https://example.com/jobs/1" })), false);
  // An unscreened row that fails a cheap rule gets no eligibility blocker of its own.
  assert.deepEqual(qualify(row({ score: "3/5", eligibility: "unchecked" })).blockers, ["Its score 3/5 is under 4/5."]);
  assert.deepEqual(qualify(row({ eligibility: "unchecked" })).blockers, ["Eligibility was not screened."]);
});

test("the sync adds qualifying rows, follows the tracker and keeps the person's removals", () => {
  const later = (m) => new Date(NOW.getTime() + m * 60_000);
  let items = syncItems([], [row(), row({ trackerNumber: "22", score: "3/5" })], NOW);
  assert.equal(items.length, 1, "only the qualifying row is added");
  assert.equal(items[0].state, "queued");
  assert.equal(items[0].addedAt, NOW.toISOString());
  assert.equal(syncItems(items, [row()], later(1)), null, "nothing changed, nothing to write");

  // Rescored below the bar: withdrawn with the reason; rescored back: queued again.
  items = syncItems(items, [row({ score: "3.8/5" })], later(2));
  assert.equal(items[0].state, "withdrawn");
  assert.deepEqual(items[0].blockers, ["Its score 3.8/5 is under 4/5."]);
  items = syncItems(items, [row({ score: "4.6/5" })], later(3));
  assert.equal(items[0].state, "queued");
  assert.equal(items[0].score, 4.6);
  assert.deepEqual(items[0].blockers, []);

  // The person applied: applied stays applied whatever happens later.
  items = syncItems(items, [row({ status: "Applied" })], later(4));
  assert.equal(items[0].state, "applied");
  assert.equal(syncItems(items, [row({ status: "Evaluated" })], later(5)), null);

  // A removed item is never added back, even though its row qualifies.
  const removed = syncItems([], [row({ trackerNumber: "30" })], NOW).map((i) => ({ ...i, state: "removed" }));
  assert.equal(syncItems(removed, [row({ trackerNumber: "30" })], later(1)), null);

  // A row gone from the tracker withdraws its item.
  const gone = syncItems(syncItems([], [row({ trackerNumber: "31" })], NOW), [], later(1));
  assert.equal(gone[0].state, "withdrawn");
  assert.deepEqual(gone[0].blockers, ["The row is no longer in the tracker."]);
});

test("the same tracker number with a different posting is a different item", () => {
  let items = syncItems([], [row()], NOW);
  items = syncItems(items, [row({ postingUrl: LEVER })], NOW);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => i.state), ["withdrawn", "queued"]);
});

test("the queue file: missing is empty, written owner-only, and a damaged file is never overwritten", () => {
  const root = tmpRoot();
  assert.deepEqual(readQueue(root), { version: 1, revision: 0, items: [] });
  const q = syncQueue(root, [row()], NOW);
  assert.equal(q.revision, 1);
  assert.equal(readQueue(root).items[0].company, "Fictional Co");
  if (process.platform !== "win32") assert.equal(fs.statSync(path.join(root, APPLY_QUEUE_FILE)).mode & 0o777, 0o600);
  assert.equal(syncQueue(root, [row()], NOW).revision, 1, "no change, no write");
  fs.writeFileSync(path.join(root, APPLY_QUEUE_FILE), "{ not json");
  assert.throws(() => syncQueue(root, [row()], NOW), /not valid JSON/);
  assert.equal(fs.readFileSync(path.join(root, APPLY_QUEUE_FILE), "utf8"), "{ not json");
  fs.writeFileSync(path.join(root, APPLY_QUEUE_FILE), JSON.stringify({ version: 1, revision: 3, items: [{ id: "x" }] }));
  assert.throws(() => readQueue(root), /unexpected shape/);
});

test("the person removes and restores items, and a stale tab is refused", () => {
  const root = tmpRoot();
  const q = syncQueue(root, [row()], NOW);
  const id = q.items[0].id;
  const removed = changeItem(root, { revision: q.revision, id, action: "remove", now: NOW });
  assert.equal(removed.items[0].state, "removed");
  assert.throws(() => changeItem(root, { revision: q.revision, id, action: "restore" }), /changed in another tab/);
  assert.equal(syncQueue(root, [row()], NOW).items[0].state, "removed", "the sync does not undo a removal");
  const restored = changeItem(root, { revision: removed.revision, id, action: "restore", now: NOW });
  assert.equal(restored.items[0].state, "queued");
  assert.throws(() => changeItem(root, { revision: restored.revision, id, action: "restore" }), /Only a removed item/);
  assert.throws(() => changeItem(root, { revision: restored.revision, id: "nope", action: "remove" }), /no longer exists/);
  assert.throws(() => changeItem(root, { revision: restored.revision, id, action: "submit" }), /remove or restore/);
  const applied = syncQueue(root, [row({ status: "Applied" })], NOW);
  assert.throws(() => changeItem(root, { revision: applied.revision, id, action: "remove" }), /stays in the queue as a record/);
});

test("at most 10 are prepared per local calendar day", () => {
  const day = (h) => new Date(2026, 10, 14, h).toISOString();
  const prepared = (iso) => ({ preparedAt: iso });
  const queue = { version: 1, revision: 1, items: [] };
  assert.equal(preparesLeftToday(queue, new Date(2026, 10, 14, 12)), 10);
  queue.items = Array.from({ length: 7 }, () => prepared(day(9)));
  queue.items.push(prepared(new Date(2026, 10, 13, 23).toISOString()), { preparedAt: null });
  assert.equal(preparesLeftToday(queue, new Date(2026, 10, 14, 12)), 3, "yesterday's and unprepared ones do not count");
  queue.items.push(...Array.from({ length: 5 }, () => prepared(day(10))));
  assert.equal(preparesLeftToday(queue, new Date(2026, 10, 14, 12)), 0, "never negative");
  assert.equal(preparesLeftToday(queue, new Date(2026, 10, 15, 8)), 10, "a new day starts again");
});
