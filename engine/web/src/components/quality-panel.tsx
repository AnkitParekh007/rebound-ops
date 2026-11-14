import { Badge } from "@/components/ui/badge";
import { STALE_DAYS } from "@/lib/eligibility/quality-view.mjs";

export type QualityView = {
  pay:
    | { status: "stated"; evidence: string; source: "report" | "capture" }
    | { status: "not_found"; source: "report" | "capture" }
    | { status: "unread"; reason: string };
  scan:
    | { status: "no_url" }
    | { status: "no_pipeline" }
    | { status: "no_row" }
    | { status: "row"; postedAt: string | null; ageDays: number | null; stale: boolean; crossListed: boolean; label: string | null };
};

const SCAN_MISSING: Record<string, string> = {
  no_url: "This report has no posting URL, so its scan row cannot be found.",
  no_pipeline: "data/pipeline.md could not be read, so age and cross-listing are not shown.",
  no_row: "No row in data/pipeline.md has this posting's URL, so age and cross-listing are not shown.",
};

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** Posting-quality signals for this report. Rendered only when the eligibilityScreening flag is on. */
export function QualityPanel({ view }: { view: QualityView }) {
  const { pay, scan } = view;
  return (
    <section aria-labelledby="quality-heading" className="mt-6 rounded-2xl border border-border bg-surface/40 px-5 py-5">
      <h2 id="quality-heading" className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
        Posting quality
      </h2>
      <ul className="mt-4 space-y-4">
        <li className="rounded-xl border border-border bg-background/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Pay</span>
            {pay.status === "stated" && <Badge tone="good">Pay stated</Badge>}
            {pay.status === "not_found" && <Badge tone="warn">No pay found</Badge>}
            {pay.status === "unread" && <Badge tone="muted">Not read</Badge>}
          </div>
          {pay.status === "stated" && (
            <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm italic text-muted">&ldquo;{pay.evidence}&rdquo;</blockquote>
          )}
          {pay.status === "not_found" && (
            <p className="mt-2 text-sm text-foreground">No sentence in the archived posting states a pay figure or range.</p>
          )}
          {pay.status === "unread" && <p className="mt-2 text-sm text-muted">{pay.reason} Pay was not checked.</p>}
        </li>
        <li className="rounded-xl border border-border bg-background/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Age and cross-listing</span>
            {scan.status === "row" && scan.stale && <Badge tone="warn">{`${scan.ageDays}d old`}</Badge>}
            {scan.status === "row" && scan.crossListed && <Badge tone="warn">Cross-listed</Badge>}
          </div>
          {scan.status === "row" ? (
            <>
              <p className="mt-2 text-sm text-foreground">
                {scan.postedAt === null
                  ? "The scan row has no posted date, so the posting's age is unknown."
                  : scan.ageDays === null
                    ? `The scan row's posted date (${scan.postedAt}) is in the future, so the posting's age is unknown.`
                    : `Posted ${scan.postedAt}, ${days(scan.ageDays)} ago${scan.stale ? "" : ` (under ${STALE_DAYS} days)`}.`}{" "}
                {scan.crossListed
                  ? "The scan found the same text in a different company's recent posting."
                  : "The scan did not mark it as cross-listed."}
              </p>
              {scan.label !== null && <p className="mt-1 font-mono text-xs text-faint">Scan label: qual: {scan.label}</p>}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">{SCAN_MISSING[scan.status]}</p>
          )}
        </li>
      </ul>
      <p className="mt-4 text-xs text-faint">
        Rules only, no model. Pay is read from the posting archived in this report
        {pay.status !== "unread" && pay.source === "capture" ? " (its jds/ capture)" : ""}; age and cross-listing come
        from the scan&apos;s row in data/pipeline.md. These are labels: nothing is hidden or ranked.
      </p>
    </section>
  );
}
