// The posting-quality panel on a pipeline report: pay from the archived
// posting, age and cross-listing from the scan's pipeline.md row. Fictional
// reports, postings and rows only.
import test from "node:test";
import assert from "node:assert/strict";
import { reportQuality } from "../../src/lib/eligibility/quality-view.mjs";
import { payEvidence } from "../../src/lib/eligibility/quality.mjs";
import { findPipelineRow, parseInbox } from "../../src/lib/pipeline-table.mjs";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 14);
const URL = "https://jobs.fictional.example/data-engineer";

const POSTING = [
  "Fictional Co is hiring a data engineer.",
  "We raised $20M last year.",
  "The salary range for this role is €70,000 – €85,000 per year.",
  "You must be authorized to work in Germany.",
].join("\n");
const report = (section) => `# Data Engineer: Fictional Co\n\n**URL:** ${URL}\n\n## Job Description (archived verbatim)\n\n${section}\n`;
const noCapture = () => null;

test("payEvidence quotes the first sentence that states pay, not company money before it", () => {
  assert.equal(payEvidence(POSTING), "The salary range for this role is €70,000 – €85,000 per year.");
  assert.equal(payEvidence("We raised $20M last year. Competitive salary."), null);
  assert.equal(payEvidence(`Salary: $90,000. More text follows ${"x".repeat(400)}`), "Salary: $90,000.");
  assert.equal(payEvidence(`Salary: $90,000 ${"and more ".repeat(60)}`)?.length, 300);
});

test("findPipelineRow finds the row by URL, ignoring a trailing slash or fragment, and keeps its labels", () => {
  const md = [
    `- [x] ${URL}/ | Fictional Co | Data Engineer | Berlin | | posted: 2026-09-20 | qual: no pay found, 55d old, cross-listed`,
    "- [ ] https://jobs.other.example/1 | Other Co | Analyst",
  ].join("\n");
  const row = findPipelineRow(md, `${URL}#apply`);
  assert.ok(row);
  assert.equal(row.job.postedAt, "2026-09-20");
  assert.equal(row.labels.get("qual"), "no pay found, 55d old, cross-listed");
  assert.equal(findPipelineRow(md, "https://jobs.fictional.example/other"), null);
  assert.equal(findPipelineRow(md, ""), null);
  // parseInbox keeps its shape: labels are not added to inbox jobs.
  assert.equal("labels" in parseInbox(md)[0], false);
});

test("pay is read from the archived posting and quoted", () => {
  const q = reportQuality({ report: report(POSTING), readCapture: noCapture, pipelineMd: "", postingUrl: URL, now: NOW });
  assert.deepEqual(q.pay, { status: "stated", evidence: "The salary range for this role is €70,000 – €85,000 per year.", source: "report" });
});

test("no pay figure, a capture, and no archived posting each say so", () => {
  const noPay = "Fictional Co is hiring a data engineer.\nCompetitive salary and benefits.\nYou must be authorized to work in Germany.";
  assert.deepEqual(reportQuality({ report: report(noPay), readCapture: noCapture, pipelineMd: "", postingUrl: URL, now: NOW }).pay, {
    status: "not_found",
    source: "report",
  });
  const pointer = report("See jds/042-fictional-co.md for the full archive (archive-posting.mjs --report=042).");
  const capture = reportQuality({ report: pointer, readCapture: () => `${noPay}\nPay: $40/hr.`, pipelineMd: "", postingUrl: URL, now: NOW });
  assert.equal(capture.pay.status, "stated");
  assert.equal(capture.pay.source, "capture");
  const unread = reportQuality({ report: "# No posting\n\n**URL:** x\n", readCapture: noCapture, pipelineMd: "", postingUrl: URL, now: NOW });
  assert.equal(unread.pay.status, "unread");
  assert.match(unread.pay.reason, /no archived posting/);
});

test("age is counted from the row's posted date to now, and cross-listing comes from its qual: label", () => {
  const md = `- [x] ${URL} | Fictional Co | Data Engineer | Berlin | | posted: 2026-09-20 | qual: no pay found, 40d old, cross-listed`;
  const q = reportQuality({ report: report(POSTING), readCapture: noCapture, pipelineMd: md, postingUrl: URL, now: NOW });
  assert.deepEqual(q.scan, {
    status: "row",
    postedAt: "2026-09-20",
    ageDays: 55,
    stale: true,
    crossListed: true,
    label: "no pay found, 40d old, cross-listed",
  });
  const fresh = `- [ ] ${URL} | Fictional Co | Data Engineer | | | posted: ${new Date(NOW - 3 * DAY).toISOString().slice(0, 10)} | qual: pay stated`;
  const f = reportQuality({ report: report(POSTING), readCapture: noCapture, pipelineMd: fresh, postingUrl: URL, now: NOW }).scan;
  assert.equal(f.status, "row");
  assert.equal(f.ageDays, 3);
  assert.equal(f.stale, false);
  assert.equal(f.crossListed, false);
});

test("a row without a posted date or qual: label, a future date, no row, no file and no URL are told apart", () => {
  const bare = reportQuality({ report: report(POSTING), readCapture: noCapture, pipelineMd: `- [x] ${URL} | Fictional Co | Data Engineer`, postingUrl: URL, now: NOW }).scan;
  assert.deepEqual(bare, { status: "row", postedAt: null, ageDays: null, stale: false, crossListed: false, label: null });
  const future = reportQuality({ report: report(POSTING), readCapture: noCapture, pipelineMd: `- [x] ${URL} | Fictional Co | Data Engineer | | | posted: 2027-01-01`, postingUrl: URL, now: NOW }).scan;
  assert.equal(future.status, "row");
  assert.equal(future.postedAt, "2027-01-01");
  assert.equal(future.ageDays, null);
  const base = { report: report(POSTING), readCapture: noCapture, now: NOW };
  assert.deepEqual(reportQuality({ ...base, pipelineMd: "- [ ] https://jobs.other.example/1 | Other", postingUrl: URL }).scan, { status: "no_row" });
  assert.deepEqual(reportQuality({ ...base, pipelineMd: null, postingUrl: URL }).scan, { status: "no_pipeline" });
  assert.deepEqual(reportQuality({ ...base, pipelineMd: "", postingUrl: "" }).scan, { status: "no_url" });
});
