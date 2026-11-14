// node tests/fixtures/eligibility-panel.mjs prints a fresh disposable data
// root for eligibility-panel.browser.test.mjs. Everything is fictional: row 21
// archives its posting in the report (with a pay range) and has a scan row in
// data/pipeline.md, row 22 points to a jds/ capture with no pay and has no scan
// row, and row 23 has no archived posting. The profile names no real person.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "rebound-ops-eligibility-"));
for (const dir of ["data", "reports", "jds", "config"]) fs.mkdirSync(path.join(root, dir));
fs.writeFileSync(path.join(root, ".inline-status-fixture"), "fictional-only\n");
fs.writeFileSync(path.join(root, "data/applications.md"), `# Fictional browser fixture

| # | Date | Company | Role | Location | Score | Status | PDF | Report | Notes |
|---|------|---------|------|----------|-------|--------|-----|--------|-------|
| 21 | 2026-11-14 | Fixture Archive Co | Data Engineer | Berlin, Germany | 4.1/5 | Evaluated | — | [21](../reports/021-fixture-archive-co.md) | Fictional fixture only |
| 22 | 2026-11-14 | Fixture Capture Co | Analyst | London, United Kingdom | 3.9/5 | Evaluated | — | [22](../reports/022-fixture-capture-co.md) | Fictional fixture only |
| 23 | 2026-11-14 | Fixture Empty Co | Designer | Remote | 3.6/5 | Evaluated | — | [23](../reports/023-fixture-empty-co.md) | Fictional fixture only |
`);

const archived = [
  "Fixture Archive Co is hiring a data engineer.",
  "You must be authorized to work in Germany.",
  "We are unable to sponsor visas.",
  "Fluent German is required.",
  "5+ years of experience in data engineering required.",
  "The salary range for this role is €68,000 – €82,000 per year.",
].join("\n");
fs.writeFileSync(
  path.join(root, "reports/021-fixture-archive-co.md"),
  `# Fixture Archive Co — Data Engineer\n\n**URL:** https://jobs.fixture-archive.example/data-engineer\n**Score:** 4.1/5\n\n## A) Role Summary\n\nFictional browser test report.\n\n## Job Description (archived verbatim)\n\n${archived}\n`,
);
fs.writeFileSync(
  path.join(root, "reports/022-fixture-capture-co.md"),
  "# Fixture Capture Co — Analyst\n\n**URL:** https://jobs.fixture-capture.example/analyst\n**Score:** 3.9/5\n\n## A) Role Summary\n\nFictional browser test report.\n\n## Job Description (archived verbatim)\n\nSee jds/022-fixture-capture-co.md for the full archive (archive-posting.mjs --report=022).\n",
);
fs.writeFileSync(
  path.join(root, "jds/022-fixture-capture-co.md"),
  "Fixture Capture Co is hiring an analyst in London.\nCandidates must have the right to work in the UK.\nA Bachelor's degree in Economics is required.\n",
);
fs.writeFileSync(
  path.join(root, "reports/023-fixture-empty-co.md"),
  "# Fixture Empty Co — Designer\n\n**URL:** https://jobs.fixture-empty.example/designer\n**Score:** 3.6/5\n\n## A) Role Summary\n\nFictional browser test report with no archived posting.\n",
);
fs.writeFileSync(
  path.join(root, "config/profile.yml"),
  "# Fictional browser fixture profile\ncandidate:\n  full_name: Fixture Person\n  email: fixture@example.invalid\n  years_of_experience: 6\nlocation:\n  country: Germany\n  authorized_in: [Germany]\n  needs_sponsorship: true\n",
);
fs.writeFileSync(
  path.join(root, "data/pipeline.md"),
  "# Pipeline\n\n- [x] https://jobs.fixture-archive.example/data-engineer | Fixture Archive Co | Data Engineer | Berlin, Germany | | posted: 2026-01-05 | qual: pay stated, 313d old, cross-listed\n- [ ] https://jobs.fixture-unrelated.example/1 | Fixture Unrelated Co | Tester\n",
);
fs.writeFileSync(path.join(root, "cv.md"), "# Fictional browser fixture\n\nNot a real candidate.\n");
console.log(root);
