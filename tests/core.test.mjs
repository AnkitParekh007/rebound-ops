import test from "node:test";
import assert from "node:assert/strict";
import { ROUTES, buildPlan, parseEvidence, getProgress, exportMarkdown, normalizeHours } from "../src/core.mjs";

test("all routes generate an ordered plan within the user's weekly budget", () => {
  for (const id of Object.keys(ROUTES)) {
    for (const hours of [1, 2, 4, 6, 20]) {
      const plan = buildPlan(id, hours);
      assert.ok(plan.actions.length > 0);
      assert.ok(plan.plannedMinutes <= plan.budgetMinutes);
      assert.equal(plan.plannedMinutes, plan.actions.reduce((total, action) => total + action.minutes, 0));
      assert.deepEqual(plan.actions.map(a => a.day), plan.actions.map((_, i) => i + 1));
    }
  }
});

test("invalid hours and unknown routes are rejected", () => {
  for (const hours of [0, -3, 21, Infinity, "foo", NaN]) {
    assert.throws(() => normalizeHours(hours), RangeError);
  }
  assert.throws(() => buildPlan("madeup", 6), RangeError);
});

test("evidence inventory never invents facts or strips the original source line", () => {
  const evidence = parseEvidence("\nLed frontend migration\n\nWrote test suite\n");
  assert.deepEqual(evidence.map(i => i.claim), ["Led frontend migration", "Wrote test suite"]);
  assert.equal(evidence[0].source, "User-entered line 2 (unverified)");
  assert.equal(evidence[1].source, "User-entered line 4 (unverified)");
  assert.deepEqual(parseEvidence(""), []);
});

test("progress counts only known tasks and is reversible", () => {
  const plan = buildPlan("return", 6);
  const first = plan.actions[0];
  assert.equal(getProgress(plan, [first.id, "unknown", first.id]).completedCount, 1);
  assert.equal(getProgress(plan, []).completedCount, 0);
});

test("markdown export contains sources, selection and action progress", () => {
  const plan = buildPlan("shift", 3);
  const doc = exportMarkdown({
    profile: { role: "Frontend Engineer", location: "Remote", urgency: "quarter", priorities: "Hands-on work", shiftTarget: "AI Engineer" },
    evidence: parseEvidence("Reduced build time"),
    plan,
    completedIds: [plan.actions[0].id],
    reviewNotes: "Completed one action"
  });
  assert.match(doc, /User-entered line 1 \(unverified\)/);
  assert.match(doc, /\*\*Shift\*\* — AI Engineer/);
  assert.match(doc, /- \[x\] Day 1/);
  assert.match(doc, /Completed one action/);
});
