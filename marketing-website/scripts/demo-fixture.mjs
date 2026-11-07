import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// Synthetic career data, written only under a caller-created temporary directory.
export function seedDemo(root) {
  for (const dir of [
    "config",
    "data",
    "modes",
    "reports",
    "jds",
    "interview-prep",
  ])
    mkdirSync(path.join(root, dir), { recursive: true });
  const write = (file, text) => writeFileSync(path.join(root, file), text);
  write(
    "cv.md",
    "# Demo Candidate\n\nFictional software professional used only for website screenshots.\n",
  );
  write(
    "config/profile.yml",
    "candidate:\n  full_name: Demo Candidate\n  email: demo@example.test\ntarget_roles:\n  primary:\n    - Senior Software Engineer\n    - Platform Engineer\n    - Engineering Lead\ntarget:\n  roles: [Senior Software Engineer, Platform Engineer]\n",
  );
  write(
    "portals.yml",
    "tracked_companies: []\nrussian_portals:\n  sources: []\n",
  );
  write(
    "config/two-pager.yml",
    "who_i_am: Fictional demo software professional.\nloves: [remote work, platform engineering]\nmust_haves: []\nhates: []\ndeal_breakers: []\nnon_negotiables: []\n",
  );
  write(
    "modes/_profile.md",
    "# Demo profile\n\nAll content in this fixture is fictional.\n",
  );
  for (const mode of ["_shared", "oferta", "deep", "project", "interview-prep"])
    write(
      `modes/${mode}.md`,
      "# Demo mode\n\nUse only the synthetic demo facts.\n",
    );
  const rows = [
    [
      "Northstar Example Labs",
      "Senior Software Engineer",
      "Remote",
      "greenhouse",
      "Evaluated",
    ],
    [
      "Fieldwork Example Studio",
      "Platform Engineer",
      "Bengaluru, India",
      "lever",
      "Applied",
    ],
    [
      "Orbit Example Systems",
      "Engineering Lead",
      "Remote",
      "ashby",
      "Interview",
    ],
  ].map(([company, title, location, source, status], i) => ({
    company,
    title,
    location,
    source,
    status,
    url: `https://example.test/jobs/demo-${i + 1}`,
    isRemote: location === "Remote",
    workplaceType: location === "Remote" ? "Remote" : "Hybrid",
    date: "2026-11-01",
  }));
  write(
    "data/last-scan.json",
    JSON.stringify({
      en: {
        kind: "en",
        when: "2026-11-01T09:00:00.000Z",
        fresh: rows,
        filtered: rows,
      },
      ru: {
        kind: "ru",
        when: "2026-11-01T09:00:00.000Z",
        fresh: [],
        filtered: [],
      },
    }),
  );
  write(
    "data/applications.md",
    "# Demo applications — fictional fixtures\n\n| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|\n" +
      rows
        .map(
          (row, i) =>
            `| ${i + 1} | 2026-11-01 | ${row.company} | ${row.title} | | ${row.status} | | | Fictional website demo |`,
        )
        .join("\n") +
      "\n",
  );
  write(
    "data/pipeline.md",
    "# Pipeline\n\n```\nhttps://example.test/jobs/demo-1\n```\n",
  );
  return rows;
}
