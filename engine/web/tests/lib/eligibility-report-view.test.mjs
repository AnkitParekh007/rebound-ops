// The eligibility panel on a pipeline report: which posting text it screens
// and what it says when there is none. Fictional reports and profiles only.
import test from "node:test";
import assert from "node:assert/strict";
import { archivedPosting, screenReport } from "../../src/lib/eligibility/report-view.mjs";
import { parseYearsRequirement } from "../../src/lib/eligibility/years.mjs";

const POSTING = [
  "Fictional Co is hiring a data engineer.",
  "You must be authorized to work in Germany.",
  "We are unable to sponsor visas.",
  "Fluent German is required.",
  "5+ years of experience in data engineering required.",
].join("\n");

const report = (section) => `# Data Engineer: Fictional Co\n\n**Score:** 4.1/5\n\n## A) Role Summary\n\nText.\n\n## Job Description (archived verbatim)\n\n${section}\n\n## Machine Summary\n\nnot part of the posting\n`;

const profile = (location = {}, candidate = {}) => ({ location, candidate });
const noCapture = () => null;

test("the archived section is the posting, up to the next level-two heading", () => {
  const p = archivedPosting(report(POSTING));
  assert.equal(p.kind, "text");
  assert.ok(p.text.startsWith("Fictional Co is hiring"));
  assert.ok(!p.text.includes("Machine Summary"));
  assert.ok(!p.text.includes("not part of the posting"));
});

test("a level-three heading inside the posting stays in it", () => {
  const p = archivedPosting(report(`### Requirements\n\n${POSTING}`));
  assert.equal(p.kind, "text");
  assert.match(p.text, /### Requirements/);
});

test("the canonical pointer names a jds/ capture, and nothing else counts as one", () => {
  assert.deepEqual(archivedPosting(report("See jds/042-fictional-co.md for the full archive (archive-posting.mjs --report=042).")), {
    kind: "capture",
    file: "042-fictional-co.md",
  });
  for (const pointer of [
    "See jds/../config/profile.yml for the full archive.",
    "See jds/sub/dir.md for the full archive.",
    "See jds/..md for the full archive.",
  ]) {
    assert.notEqual(archivedPosting(report(pointer)).kind, "capture", pointer);
  }
});

test("no section, a placeholder or a too-short section is no posting", () => {
  assert.deepEqual(archivedPosting("# Report\n\nNo archive here."), { kind: "none" });
  assert.deepEqual(archivedPosting(report("<!-- paste JD here -->")), { kind: "none" });
  assert.deepEqual(archivedPosting(report("TBD")), { kind: "none" });
  assert.deepEqual(archivedPosting(null), { kind: "none" });
});

test("a screened report quotes each requirement and checks it against the profile", () => {
  const view = screenReport({
    report: report(POSTING),
    location: "Berlin, Germany",
    profile: profile({ authorized_in: ["Germany"], needs_sponsorship: false, country: "Germany" }, { years_of_experience: 6 }),
    readCapture: noCapture,
  });
  assert.equal(view.status, "screened");
  assert.equal(view.source, "report");
  assert.equal(view.profileRead, true);
  const byKind = Object.fromEntries(view.checks.map((c) => [c.kind, c]));
  assert.equal(byKind.work_authorization.verdict, "meets");
  assert.equal(byKind.sponsorship.verdict, "meets");
  assert.equal(byKind.language.verdict, "unknown");
  assert.equal(byKind.experience_years.verdict, "meets");
  assert.equal(byKind.work_authorization.evidence, "You must be authorized to work in Germany.");
  assert.equal(view.outcome, "needs_review");
});

test("years come from the posting, the same parser the CLI uses", () => {
  const view = screenReport({ report: report(POSTING), profile: profile({}, { years_of_experience: 2 }), readCapture: noCapture });
  const years = view.checks.find((c) => c.kind === "experience_years");
  assert.ok(years, "a years check is made");
  assert.equal(parseYearsRequirement(POSTING).status, "stated");
});

test("a capture is read through the reader the page passes in", () => {
  const asked = [];
  const view = screenReport({
    report: report("See jds/042-fictional-co.md for the full archive (archive-posting.mjs --report=042)."),
    profile: profile(),
    readCapture: (file) => (asked.push(file), POSTING),
  });
  assert.deepEqual(asked, ["042-fictional-co.md"]);
  assert.equal(view.status, "screened");
  assert.equal(view.source, "capture");
});

test("a capture that cannot be read, or no posting, is said plainly and nothing is screened", () => {
  const missing = screenReport({ report: report("See jds/042-gone.md for the full archive."), profile: profile(), readCapture: noCapture });
  assert.deepEqual(missing, { status: "no_posting", reason: "The report points to jds/042-gone.md, which could not be read." });
  const none = screenReport({ report: "# Report\n", profile: profile(), readCapture: noCapture });
  assert.equal(none.status, "no_posting");
});

test("an unreadable profile still quotes the requirements, and says so", () => {
  const view = screenReport({ report: report(POSTING), location: "Berlin, Germany", profile: null, readCapture: noCapture });
  assert.equal(view.status, "screened");
  assert.equal(view.profileRead, false);
  assert.ok(view.checks.length >= 4);
  assert.ok(view.checks.every((c) => c.verdict !== "does_not_meet"), "missing facts never count against the person");
});
