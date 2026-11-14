/**
 * The posting-quality panel on a pipeline report (operations feature #3,
 * behind the `eligibilityScreening` flag), next to the eligibility panel.
 *
 * Two sources, each named on the page:
 *   - pay: read from the posting archived in the report (the same text the
 *     eligibility panel screens) with the scan's pay detector, quoting the
 *     sentence that states it;
 *   - age and cross-listing: from the scan's row for the report's posting URL
 *     in data/pipeline.md (its `posted:` date and its `qual:` label). Age is
 *     counted from the posted date to today, not copied from the label.
 * Pure: the page passes in the report, a `jds/` reader, the pipeline.md text,
 * the posting URL and the time, so nothing here touches the disk.
 */
import { archivedPostingText } from "./report-view.mjs";
import { payEvidence, postingAgeDays, STALE_DAYS } from "./quality.mjs";
import { findPipelineRow } from "../pipeline-table.mjs";

export { STALE_DAYS };

/**
 * @param {{
 *   report: string | null | undefined,
 *   readCapture: (file: string) => string | null,
 *   pipelineMd: string | null,
 *   postingUrl: string | null | undefined,
 *   now: number,
 * }} input `pipelineMd` is data/pipeline.md, or null when it could not be read.
 * @returns {{
 *   pay: { status: "stated", evidence: string, source: "report" | "capture" }
 *     | { status: "not_found", source: "report" | "capture" }
 *     | { status: "unread", reason: string },
 *   scan: { status: "no_url" } | { status: "no_pipeline" } | { status: "no_row" }
 *     | { status: "row", postedAt: string | null, ageDays: number | null, stale: boolean, crossListed: boolean, label: string | null },
 * }}
 */
export function reportQuality({ report, readCapture, pipelineMd, postingUrl, now }) {
  const posting = archivedPostingText({ report, readCapture });
  /** @type {ReturnType<typeof reportQuality>["pay"]} */
  let pay;
  if ("reason" in posting) pay = { status: "unread", reason: posting.reason };
  else {
    const evidence = payEvidence(posting.text);
    pay = evidence === null ? { status: "not_found", source: posting.source } : { status: "stated", evidence, source: posting.source };
  }
  return { pay, scan: scanRow({ pipelineMd, postingUrl, now }) };
}

/** @param {{ pipelineMd: string | null, postingUrl: string | null | undefined, now: number }} input */
function scanRow({ pipelineMd, postingUrl, now }) {
  if (!postingUrl) return /** @type {const} */ ({ status: "no_url" });
  if (typeof pipelineMd !== "string") return /** @type {const} */ ({ status: "no_pipeline" });
  const row = findPipelineRow(pipelineMd, postingUrl);
  if (!row) return /** @type {const} */ ({ status: "no_row" });
  const postedAt = row.job.postedAt ?? null;
  const ageDays = postedAt === null ? null : postingAgeDays(Date.parse(`${postedAt}T00:00:00Z`), now);
  const label = row.labels.get("qual") ?? null;
  return /** @type {const} */ ({
    status: "row",
    postedAt,
    ageDays,
    stale: ageDays !== null && ageDays >= STALE_DAYS,
    // The scan's own fingerprint check wrote this; the page cannot re-run it.
    crossListed: label !== null && /\bcross-listed\b/i.test(label),
    label,
  });
}
