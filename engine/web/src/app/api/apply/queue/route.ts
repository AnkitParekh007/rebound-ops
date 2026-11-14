import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { reboundOpsRoot, readApplications, readReport, isRegularContainedFile } from "@/lib/rebound-ops";
import { readJsonObject } from "@/lib/json-body";
import { parseReport } from "@/lib/format";
import { resolvePostingUrl } from "@/lib/posting-url.mjs";
import { getProfilePath } from "@/lib/core/profile-path.mjs";
import { screenReport } from "@/lib/eligibility/report-view.mjs";
import {
  ApplyQueueError,
  APPLY_QUEUE_DAILY_CAP,
  APPLY_QUEUE_MIN_SCORE,
  autoApplyEnabled,
  changeItem,
  passesCheapRules,
  preparesLeftToday,
  syncQueue,
} from "@/lib/apply/apply-queue.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Controlled Auto Apply queue (R3 AA-02, behind the `autoApply` flag).
// Prepare-only: ReboundOps never submits; see apply-queue.mjs for the rules.
// GET brings the queue up to date with the tracker (qualifying rows are added
// automatically, owner decision 14 Nov 2026) and returns it.

function off() {
  return Response.json({ error: "The apply queue is part of Controlled Auto Apply, which is off. Set REBOUNDOPS_FEATURES=autoApply to use it." }, { status: 404 });
}

function failure(e: unknown) {
  if (e instanceof ApplyQueueError) return Response.json({ error: e.message }, { status: e.status });
  return Response.json({ error: "The apply queue could not be read or changed." }, { status: 500 });
}

type Eligibility = "blocked" | "needs_review" | "eligible" | "no_requirements" | "not_screened" | "unchecked";

/** Tracker rows with what the queue needs. Eligibility is screened only for rows that pass the cheap rules. */
function candidates(root: string) {
  let profile: unknown = null;
  try {
    profile = yaml.load(fs.readFileSync(getProfilePath(root), "utf8"));
  } catch {
    profile = null;
  }
  const jds = path.join(root, "jds");
  const readCapture = (file: string): string | null => {
    const p = path.join(jds, file);
    if (!isRegularContainedFile(p, jds)) return null;
    try {
      return fs.readFileSync(/* turbopackIgnore: true */ p, "utf8");
    } catch {
      return null;
    }
  };
  return readApplications().map((app) => {
    const report = readReport(app.n)?.content ?? null;
    const fields = parseReport(report ?? "").fields;
    const postingUrl = resolvePostingUrl(app.url, fields.find((f) => f.label === "URL")?.value);
    const base = { trackerNumber: app.n, company: app.company, role: app.role, status: app.status, score: app.score, postingUrl };
    let eligibility: Eligibility = "unchecked";
    if (passesCheapRules(base)) {
      const location = app.location || fields.find((f) => f.label === "Location")?.value || undefined;
      const screened = screenReport({ report, location, profile, readCapture });
      eligibility = screened.status === "no_posting" ? "not_screened" : (screened.outcome as Eligibility);
    }
    return { ...base, eligibility };
  });
}

export async function GET() {
  if (!autoApplyEnabled(process.env)) return off();
  try {
    const root = reboundOpsRoot();
    const queue = syncQueue(root, candidates(root));
    return Response.json({
      ...queue,
      dailyCap: APPLY_QUEUE_DAILY_CAP,
      minScore: APPLY_QUEUE_MIN_SCORE,
      preparesLeftToday: preparesLeftToday(queue),
    });
  } catch (e) {
    return failure(e);
  }
}

// { revision, id, action: "remove" | "restore" }: the person removes an item
// (it is never added back automatically) or restores a removed one.
export async function PATCH(req: Request) {
  if (!autoApplyEnabled(process.env)) return off();
  const body = await readJsonObject<{ revision?: unknown; id?: unknown; action?: unknown }>(req);
  if (!body || typeof body.revision !== "number" || typeof body.id !== "string" || (body.action !== "remove" && body.action !== "restore")) {
    return Response.json({ error: 'Send { revision, id, action: "remove" | "restore" }.' }, { status: 400 });
  }
  try {
    return Response.json(changeItem(reboundOpsRoot(), { revision: body.revision, id: body.id, action: body.action }));
  } catch (e) {
    return failure(e);
  }
}
