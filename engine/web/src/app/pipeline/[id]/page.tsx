import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { readReport, findApplication, pdfPathStatusForReport, trackerCanDelete, reboundOpsRoot, isRegularContainedFile } from "@/lib/rebound-ops";
import { resolveTailoredCover } from "@/lib/apply/cover";
import { ReportView } from "@/components/report-view";
import { pipelineQuery } from "@/lib/pipeline-navigation.mjs";
import { reportNumberFor } from "@/lib/apply-checklist.mjs";
import { tailoredCvOnDisk } from "@/lib/tailored-cv-ready.mjs";
import { parseReport } from "@/lib/format";
import * as yaml from "js-yaml";
import { getProfilePath } from "@/lib/core/profile-path.mjs";
import { eligibilityScreeningEnabled } from "@/lib/eligibility/screen.mjs";
import { screenReport } from "@/lib/eligibility/report-view.mjs";
import { reportQuality } from "@/lib/eligibility/quality-view.mjs";
import { resolvePostingUrl } from "@/lib/posting-url.mjs";
import type { EligibilityView } from "@/components/eligibility-panel";
import type { QualityView } from "@/components/quality-panel";

// Same filter /api/cv-pdf applies, so a directory or a symlink out of output/
// never marks a CV ready that the View link would refuse.
function outputPdfNames(): string[] {
  const dir = path.join(reboundOpsRoot(), "output");
  try {
    return fs
      .readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith(".pdf"))
      .filter((name) => isRegularContainedFile(path.join(dir, name), dir));
  } catch {
    return [];
  }
}

// A jds/ capture is read only as a regular file inside jds/.
function captureReader(root: string): (file: string) => string | null {
  const jds = path.join(root, "jds");
  return (file: string): string | null => {
    const p = path.join(jds, file);
    if (!isRegularContainedFile(p, jds)) return null;
    try {
      return fs.readFileSync(/* turbopackIgnore: true */ p, "utf8");
    } catch {
      return null;
    }
  };
}

// Eligibility screen and posting-quality signals of the report's archived
// posting, behind the eligibilityScreening flag. With the flag off nothing is
// read or computed. The profile is parsed here (screen.mjs copies only its
// four allowlisted keys); data/pipeline.md is read only to find the scan row
// for the report's posting URL.
function screensFor(
  content: string | null,
  location: string | undefined,
  postingUrl: string,
): { eligibility: EligibilityView | null; quality: QualityView | null } {
  if (!content || !eligibilityScreeningEnabled(process.env)) return { eligibility: null, quality: null };
  const root = reboundOpsRoot();
  let profile: unknown = null;
  try {
    profile = yaml.load(fs.readFileSync(getProfilePath(root), "utf8"));
  } catch {
    profile = null;
  }
  const pipelineFile = path.join(root, "data", "pipeline.md");
  let pipelineMd: string | null = null;
  try {
    pipelineMd = isRegularContainedFile(pipelineFile, path.join(root, "data")) ? fs.readFileSync(pipelineFile, "utf8") : null;
  } catch {
    pipelineMd = null;
  }
  const readCapture = captureReader(root);
  return {
    eligibility: screenReport({ report: content, location, profile, readCapture }) as EligibilityView,
    quality: reportQuality({ report: content, readCapture, pipelineMd, postingUrl, now: Date.now() }) as QualityView,
  };
}

export const dynamic = "force-dynamic";

export default async function ReportPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = pipelineQuery(await searchParams);
  const app = findApplication(id);
  const report = readReport(id);
  if (!app && !report) notFound();
  // Resolved here rather than in the component so the link is only rendered when
  // THIS application's cover is actually on disk. `id` is passed as the
  // application number, never as a company: a report with no tracker row has no
  // identity to match on, and guessing one from the id would surface another
  // offer's cover.
  const coverReady = (await resolveTailoredCover(app?.company, id)) !== null;
  const indexStatus = (await pdfPathStatusForReport(id)).status;
  // Same name the View link puts in ?company=, so a slug match here is the file that link would open.
  const companyName = app?.company || parseReport(report?.content ?? "").title || "";
  // The tracker's Location column, else a Location header field in the report.
  const jobLocation = app?.location || parseReport(report?.content ?? "").fields.find((f) => f.label === "Location")?.value || undefined;
  const reportFields = parseReport(report?.content ?? "").fields;
  const postingUrl = resolvePostingUrl(app?.url, reportFields.find((f) => f.label === "URL")?.value);
  const { eligibility, quality } = screensFor(report?.content ?? null, jobLocation, postingUrl);
  const pdfFileReady = tailoredCvOnDisk({
    indexStatus,
    filenames: outputPdfNames(),
    company: companyName,
  });
  return (
    <ReportView
      id={id}
      app={app}
      report={report?.content ?? null}
      file={report?.file ?? null}
      canDelete={trackerCanDelete()}
      pdfFileReady={pdfFileReady}
      trackerMarkedPdf={(app?.pdf ?? "").includes("✅")}
      coverReady={coverReady}
      backHref={`/pipeline${query ? `?${query}` : ""}`}
      applyHref={`/pipeline/${encodeURIComponent(id)}/apply${query ? `?${query}` : ""}`}
      reportNum={reportNumberFor(id, app, report?.file ?? null)}
      eligibility={eligibility}
      quality={quality}
    />
  );
}
