import { Badge } from "@/components/ui/badge";
import { KIND_LABEL, OUTCOME_LABEL, VERDICT_LABEL } from "@/lib/eligibility/report-view.mjs";

type Check = { kind: string; verdict: string; evidence: string; detail: string; basis: string[] };
export type EligibilityView =
  | { status: "no_posting"; reason: string }
  | { status: "screened"; source: "report" | "capture"; profileRead: boolean; outcome: string; checks: Check[] };

const OUTCOME_TONE: Record<string, "good" | "warn" | "bad" | "muted"> = {
  blocked: "bad",
  needs_review: "warn",
  eligible: "good",
  no_requirements: "muted",
};
const OUTCOME_TITLE: Record<string, string> = {
  blocked: "Blocked",
  needs_review: "Needs review",
  eligible: "Eligible",
  no_requirements: "No requirements found",
};
const VERDICT_TONE: Record<string, "good" | "warn" | "bad"> = { meets: "good", does_not_meet: "bad", unknown: "warn" };

const label = (map: Readonly<Record<string, string>>, key: string) => map[key] ?? key;

/** Eligibility screen of this report's archived posting. Rendered only when the flag is on. */
export function EligibilityPanel({ view }: { view: EligibilityView }) {
  return (
    <section aria-labelledby="eligibility-heading" className="mt-6 rounded-2xl border border-border bg-surface/40 px-5 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="eligibility-heading" className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
          Eligibility
        </h2>
        {view.status === "screened" && <Badge tone={OUTCOME_TONE[view.outcome] ?? "muted"}>{label(OUTCOME_TITLE, view.outcome)}</Badge>}
      </div>

      {view.status === "no_posting" ? (
        <p className="mt-3 text-sm text-muted">{view.reason} Nothing was screened.</p>
      ) : (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground">{label(OUTCOME_LABEL, view.outcome)}</p>
          {!view.profileRead && (
            <p className="mt-2 text-sm text-muted">
              config/profile.yml could not be read, so no requirement could be checked against your profile.
            </p>
          )}
          {view.checks.length > 0 && (
            <ul className="mt-4 space-y-4">
              {view.checks.map((c, i) => (
                <li key={i} className="rounded-xl border border-border bg-background/40 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{label(KIND_LABEL, c.kind)}</span>
                    <Badge tone={VERDICT_TONE[c.verdict] ?? "warn"}>{label(VERDICT_LABEL, c.verdict)}</Badge>
                  </div>
                  <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm italic text-muted">
                    &ldquo;{c.evidence}&rdquo;
                  </blockquote>
                  <p className="mt-2 text-sm text-foreground">{c.detail}</p>
                  {c.basis.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-faint">From your profile: {c.basis.join(", ")}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-faint">
            Rules only, no model. Quotes come from the posting archived in this report
            {view.source === "capture" ? " (its jds/ capture)" : ""}. Only location.authorized_in,
            location.needs_sponsorship, location.country and candidate.years_of_experience are read from your
            profile. The screen never hides or ranks a job.
          </p>
        </>
      )}
    </section>
  );
}
