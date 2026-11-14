/**
 * The eligibility panel on a pipeline report (operations feature #3, behind
 * the `eligibilityScreening` flag).
 *
 * Every report carries its posting under `## Job Description (archived
 * verbatim)` (modes/oferta.md), either as the text itself or as the one
 * canonical pointer sentence to a `jds/` capture. This module finds that
 * posting and screens it with screen.mjs and years.mjs, the same rules as the
 * eligibility-check CLI. Pure: the page passes in the parsed profile and a
 * reader for `jds/` captures, so nothing here touches the disk or the
 * environment.
 */
import { eligibilityFacts, screenEligibility } from "./screen.mjs";
import { parseYearsRequirement } from "./years.mjs";

const HEADING = /^##[ \t]+Job Description \(archived verbatim\)[ \t]*$/im;
/** The pointer sentence check-jd-archive.mjs credits, with a bare file name only. */
const POINTER = /^See jds\/([A-Za-z0-9][A-Za-z0-9._-]{0,200}\.(?:md|txt)) for the full archive\b[^\n]*$/;
const MIN_POSTING_CHARS = 50;

/**
 * Drop HTML comments (template placeholders) until none are left, so a nested
 * `<!<!-- -->-- -->` cannot leave a fresh opener behind, then drop an
 * unterminated opener and everything after it.
 * @param {string} text
 */
function withoutComments(text) {
  let previous;
  let current = text;
  do {
    previous = current;
    current = current.replace(/<!--[\s\S]*?-->/g, "");
  } while (current !== previous);
  const open = current.indexOf("<!--");
  return open === -1 ? current : current.slice(0, open);
}

/**
 * The archived posting in a report.
 * @param {string | null | undefined} report
 * @returns {{ kind: "text", text: string } | { kind: "capture", file: string } | { kind: "none" }}
 */
export function archivedPosting(report) {
  const content = String(report ?? "").replace(/\r\n?/g, "\n");
  const m = HEADING.exec(content);
  if (!m) return { kind: "none" };
  const after = content.slice(m.index + m[0].length);
  const next = after.search(/^##[ \t]/m);
  const section = withoutComments(next === -1 ? after : after.slice(0, next)).trim();
  const pointer = POINTER.exec(section);
  if (pointer && !pointer[1].includes("..")) return { kind: "capture", file: pointer[1] };
  if (section.length < MIN_POSTING_CHARS) return { kind: "none" };
  return { kind: "text", text: section };
}

/**
 * The text of a report's archived posting, from the report itself or from the
 * `jds/` capture its pointer sentence names, or the reason there is none.
 * Shared by the eligibility and posting-quality panels.
 * @param {{ report: string | null | undefined, readCapture: (file: string) => string | null }} input
 * @returns {{ text: string, source: "report" | "capture" } | { reason: string }}
 */
export function archivedPostingText({ report, readCapture }) {
  const posting = archivedPosting(report);
  if (posting.kind === "text") return { text: posting.text, source: "report" };
  if (posting.kind === "capture") {
    const read = readCapture(posting.file);
    if (typeof read === "string" && read.trim().length >= MIN_POSTING_CHARS) return { text: read, source: "capture" };
    return { reason: `The report points to jds/${posting.file}, which could not be read.` };
  }
  return { reason: "This report has no archived posting text to screen." };
}

/**
 * Screen a report's archived posting.
 * @param {{
 *   report: string | null | undefined,
 *   location?: string,
 *   profile: unknown,
 *   readCapture: (file: string) => string | null,
 * }} input `profile` is the parsed config/profile.yml, or null when it could
 *   not be read; `readCapture` returns a `jds/` file's text, or null.
 * @returns {{ status: "no_posting", reason: string }
 *   | { status: "screened", source: "report" | "capture", profileRead: boolean,
 *       outcome: string, checks: { kind: string, verdict: string, evidence: string, detail: string, basis: string[] }[] }}
 */
export function screenReport({ report, location, profile, readCapture }) {
  const posting = archivedPostingText({ report, readCapture });
  if ("reason" in posting) return { status: "no_posting", reason: posting.reason };
  const { text, source } = posting;
  const profileRead = profile !== null && typeof profile === "object";
  const result = screenEligibility({ description: text, location }, eligibilityFacts(profileRead ? profile : {}), {
    years: parseYearsRequirement(text),
  });
  return { status: "screened", source, profileRead, ...result };
}

/** Plain labels, the same words as the CLI. */
export const OUTCOME_LABEL = Object.freeze({
  blocked: "Your profile does not meet at least one stated requirement.",
  needs_review: "Some requirements are not settled by your profile. Check them yourself.",
  eligible: "Your profile meets every requirement this screen found.",
  no_requirements: "No hard requirements found. That is not the same as eligible: read the posting.",
});
export const VERDICT_LABEL = Object.freeze({ meets: "Meets", does_not_meet: "Does not meet", unknown: "Check yourself" });
export const KIND_LABEL = Object.freeze({
  work_authorization: "Work authorization",
  sponsorship: "Sponsorship",
  citizenship_or_clearance: "Citizenship or clearance",
  location: "Where you must live",
  language: "Language",
  degree: "Degree",
  experience_years: "Years of experience",
});
