/**
 * The `elig:` segment a scan writes on each new pipeline row (operations
 * feature #3, behind the `eligibilityScreening` flag).
 *
 * It screens the posting with the same rules as the eligibility-check CLI and
 * the report page, and only labels: the scan never drops, hides or reorders a
 * posting because of it. Pure: scan.mjs passes in the text and the profile
 * facts, so nothing here touches the network, the disk or the environment.
 *
 * Which text: the full description the experience filter already fetched from
 * the ATS when there is one (no extra request), else the listing's own
 * description, which can be a teaser, so the label then says "from listing".
 */
import { screenEligibility } from "./screen.mjs";
import { parseYearsRequirement } from "./years.mjs";

/** The same cap the experience filter puts on a listing description. */
export const SCAN_TEXT_CAP = 60_000;

/** Short names for the segment, in the screen's own kind order. */
export const SCAN_KIND_LABEL = Object.freeze({
  work_authorization: "work authorization",
  sponsorship: "sponsorship",
  citizenship_or_clearance: "citizenship or clearance",
  location: "location",
  language: "language",
  degree: "degree",
  experience_years: "years",
});

const OUTCOME_WORD = Object.freeze({
  blocked: "blocked",
  needs_review: "review",
  eligible: "eligible",
  no_requirements: "none found",
});

/**
 * The kinds behind an outcome, each once, in the order the checks name them.
 * @param {{ kind: string, verdict: string }[]} checks
 * @param {string} verdict
 */
function kindsWith(checks, verdict) {
  const kinds = [];
  for (const c of checks) {
    const name = SCAN_KIND_LABEL[/** @type {keyof typeof SCAN_KIND_LABEL} */ (c.kind)] ?? c.kind;
    if (c.verdict === verdict && !kinds.includes(name)) kinds.push(name);
  }
  return kinds;
}

/**
 * The `elig:` segment body for one screen result, for example
 * "blocked (sponsorship)", "review (language, degree) from listing",
 * "eligible", "none found" or "unread".
 * @param {{ outcome: string, checks: { kind: string, verdict: string }[] } | null} report
 * @param {"ats" | "listing" | null} source
 */
export function eligibilitySegmentBody(report, source) {
  if (!report) return "unread";
  const word = OUTCOME_WORD[/** @type {keyof typeof OUTCOME_WORD} */ (report.outcome)] ?? report.outcome;
  const kinds =
    report.outcome === "blocked" ? kindsWith(report.checks, "does_not_meet") : report.outcome === "needs_review" ? kindsWith(report.checks, "unknown") : [];
  const body = kinds.length ? `${word} (${kinds.join(", ")})` : word;
  return source === "listing" ? `${body} from listing` : body;
}

/**
 * Screen one new offer for the scan.
 * @param {{ fullText?: string | null, listing?: unknown, location?: unknown }} offer
 *   `fullText`: the ATS description the experience filter fetched, if any.
 * @param {ReturnType<typeof import("./screen.mjs").eligibilityFacts>} facts
 * @returns {{ outcome: string | null, source: "ats" | "listing" | null, label: string }}
 */
export function screenScanOffer({ fullText, listing, location }, facts) {
  const full = typeof fullText === "string" ? fullText.trim() : "";
  const fromListing = typeof listing === "string" ? listing.slice(0, SCAN_TEXT_CAP).trim() : "";
  const text = full || fromListing;
  if (!text) return { outcome: null, source: null, label: eligibilitySegmentBody(null, null) };
  const source = full ? "ats" : "listing";
  const report = screenEligibility({ description: text, location: typeof location === "string" ? location : "" }, facts, {
    years: parseYearsRequirement(text),
  });
  return { outcome: report.outcome, source, label: eligibilitySegmentBody(report, source) };
}

/**
 * Counts by outcome for the scan's summary line.
 * @param {{ outcome: string | null }[]} results
 */
export function summarizeScanEligibility(results) {
  const counts = { blocked: 0, needs_review: 0, eligible: 0, no_requirements: 0, unread: 0 };
  for (const r of results) {
    const key = r.outcome ?? "unread";
    if (key in counts) counts[/** @type {keyof typeof counts} */ (key)] += 1;
  }
  return counts;
}
