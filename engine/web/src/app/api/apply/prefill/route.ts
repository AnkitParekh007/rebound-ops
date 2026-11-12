import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { cliSubstitutionNotice, cliUnavailableError, resolveCliOrFallback } from "@/lib/clis";
import { reboundOpsRoot, readMemory } from "@/lib/rebound-ops";
import { getProfilePath, profileRef } from "@/lib/core/profile-path.mjs";
import { getSession } from "@/lib/apply/session";
import { resolveSessionCv } from "@/lib/apply/cv";
import { applyCvSource } from "@/lib/apply/cv-source.mjs";
import { buildAnswerPrompt } from "@/lib/apply/answer-prompt.mjs";
import { enforceAnswerPolicy } from "@/lib/apply/answer-policy.mjs";
import { profileFacts } from "@/lib/apply/profile-facts.mjs";
import { runPlanner } from "@/lib/apply/planner";
import { autofillEnabled, readLocalModelConfig } from "@/lib/apply/local-model.mjs";
import { draftNarrative, readCvText } from "@/lib/apply/narrative-draft.mjs";
import { findApproved, readApproved } from "@/lib/apply/approved-answers.mjs";
import { extractJsonObject } from "@/lib/extract-json-object.mjs";
import { readJsonObject } from "@/lib/json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 320;

// AI pre-fill (STREAMING NDJSON). The user's BYO CLI (read-only PLANNER — no
// browser access) drafts an answer per field from cv.md / profile / the job's
// report. We stream a live diagnostic log of every step (spawn, heartbeats,
// exit code/signal, parse outcome) so a stuck/empty prefill is observable on the
// page AND written to <root>/.rebound-ops-web/apply-prefill.log for debugging.
//
// `drafter: "local_model"` (Autofill AF-05, behind the `autofill` flag) drafts
// only the free-text answers with the optional local model instead of the CLI;
// see narrative-draft.mjs. Its output goes through the same answer policy.
export async function POST(req: Request) {
  const body = await readJsonObject<{ sessionId?: string; cliId?: string; company?: string; application?: string; drafter?: string }>(req);
  if (!body) return Response.json({ error: "bad json" }, { status: 400 });
  const { sessionId, cliId: requestedCliId, company, application, drafter = "cli" } = body;
  if (drafter !== "cli" && drafter !== "local_model") {
    return Response.json({ error: 'drafter must be "cli" or "local_model"' }, { status: 400 });
  }
  if (drafter === "local_model" && !autofillEnabled(process.env)) {
    return Response.json({ error: "Drafting with the local model is part of Autofill, which is off. Set REBOUNDOPS_FEATURES=autofill to use it." }, { status: 404 });
  }
  // Same two identifiers the fill route takes, validated the same way: they
  // reach a filesystem resolver, so a non-string is refused before it gets there.
  if (company !== undefined && typeof company !== "string") {
    return Response.json({ error: "company must be a string" }, { status: 400 });
  }
  if (application !== undefined && typeof application !== "string") {
    return Response.json({ error: "application must be a string" }, { status: 400 });
  }
  const t0 = Date.now();
  const encoder = new TextEncoder();
  const logPath = path.join(reboundOpsRoot(), ".rebound-ops-web", "apply-prefill.log");
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  } catch {
    /* ignore */
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* client gone */
        }
      };
      const log = (m: string) => {
        const el = Date.now() - t0;
        emit({ t: "log", m, el });
        try {
          fs.appendFileSync(logPath, `${new Date(t0 + el).toISOString()} [+${(el / 1000).toFixed(1)}s] ${m}\n`);
        } catch {
          /* ignore */
        }
      };
      // Idempotent, like the `closed` guard the sibling routes carry. fail() closes
      // the controller, and there is more than one path to it: a fencing refusal
      // reports through fail() and then resolves with an empty buffer, which the
      // empty-output branch below reports through fail() a second time. Closing an
      // already-closed controller throws "Invalid state", and that throw escapes
      // the async start() as an unhandled rejection — a worse failure than the one
      // being reported.
      let failed = false;
      const fail = (m: string, raw?: string) => {
        if (failed) return;
        failed = true;
        log(`ERROR: ${m}`);
        emit({ t: "error", m, raw });
        controller.close();
      };
      try {
        fs.appendFileSync(logPath, `\n===== prefill ${new Date(t0).toISOString()} session=${sessionId} ${drafter === "local_model" ? "drafter=local_model" : `cli=${requestedCliId}`} =====\n`);
      } catch {
        /* ignore */
      }

      const s = sessionId ? getSession(sessionId) : undefined;
      if (!s) return fail("apply session not found (it may have expired)");

      // The policy, not the drafter, decides what reaches the person as a
      // proposed value. Reviewed facts from the person's own profile.yml
      // (allowlisted keys only, never compensation) settle identity and stated
      // work authorization without any model.
      const finish = (obj: Record<string, unknown>, extra: { truncated: boolean; count: number }) => {
        let facts = null;
        try {
          facts = profileFacts(yaml.load(fs.readFileSync(getProfilePath(reboundOpsRoot()), "utf8")));
        } catch {
          log("Profile facts: config/profile.yml not readable — every answer stays a draft or yours");
        }
        // Answers the person saved for reuse (behind the autofill flag). A damaged
        // file is reported and left alone; pre-fill carries on without it.
        let approved = null;
        if (autofillEnabled(process.env)) {
          try {
            const saved = readApproved(reboundOpsRoot()).answers;
            approved = (field: { type: string; label?: string; combobox?: boolean }) => findApproved(saved, field, company);
          } catch (e) {
            log(`Saved answers not used: ${e instanceof Error ? e.message : "unreadable"}`);
          }
        }
        const { answers, summary } = enforceAnswerPolicy(s.fields, obj, { facts, approved });
        log(`Answer policy: ${summary.fromProfile} from your profile · ${summary.fromApproved} saved answers · ${summary.proposed} AI drafts · ${summary.held} held for review · ${summary.unresolved} left for you · ${summary.dropped} dropped (not on this form)`);
        emit({ t: "done", answers, truncated: extra.truncated, count: extra.count, policy: summary });
        controller.close();
      };

      if (drafter === "local_model") {
        const config = readLocalModelConfig(process.env);
        log(`Drafter: local model · ${config.state === "configured" ? `${config.model} at ${config.origin}` : config.state}`);
        const cvPath = await resolveSessionCv({ company, application, title: s.title });
        const cvSource = cvPath ? applyCvSource(reboundOpsRoot(), cvPath) : null;
        const cv = readCvText(reboundOpsRoot(), cvSource);
        if (!cv) {
          log("No CV text found (no readable tailored CV and no cv.md) — nothing to draft from");
          emit({ t: "manual", reason: "no_cv", detail: "There is no CV text to draft from. Add cv.md, or write these answers yourself.", prompt: null });
          return finish({}, { truncated: false, count: 0 });
        }
        log(`CV text: ${cv.from}${cvSource && cv.from !== cvSource ? ` (the tailored CV ${cvSource} is not readable here)` : ""} · ${cv.text.length} chars`);
        const draft = await draftNarrative({ config, title: s.title, fields: s.fields, cvText: cv.text, memory: readMemory().trim(), signal: req.signal });
        if (draft.kind === "none") {
          log("No free-text questions on this form — nothing for the local model to draft");
          return finish({}, { truncated: false, count: 0 });
        }
        if (draft.kind === "manual") {
          // The prompt carries CV text: it goes to the page only, never to the log file.
          log(`No local model draft (${draft.reason}): ${draft.detail}`);
          emit({ t: "manual", reason: draft.reason, detail: draft.detail, prompt: draft.prompt });
          return finish({}, { truncated: false, count: 0 });
        }
        log(`Local model drafted ${Object.keys(draft.answers).length} of ${draft.asked} free-text answers in ${(draft.latencyMs / 1000).toFixed(1)}s`);
        return finish(draft.answers, { truncated: false, count: Object.keys(draft.answers).length });
      }

      const resolved = requestedCliId ? resolveCliOrFallback(requestedCliId) : null;
      if (!resolved) return fail(cliUnavailableError(requestedCliId ?? "").error);
      const { spec, binPath } = resolved;
      // The CLI actually running: the planner's fencing and argv are keyed on it.
      const cliId = spec.id;
      const substitution = cliSubstitutionNotice(resolved);
      if (substitution) log(substitution);

      const mem = readMemory().trim();
      // Draft from the SAME tailored CV the fill route uploads to this form,
      // resolved through the one shared call so the answers and the resume
      // stapled to them cannot describe different documents.
      const cvPath = await resolveSessionCv({ company, application, title: s.title });
      const cvSource = cvPath ? applyCvSource(reboundOpsRoot(), cvPath) : null;
      const prompt = buildAnswerPrompt({ title: s.title, fields: s.fields, memory: mem, cvSource, profile: profileRef(reboundOpsRoot()) });

      log(`Form: "${s.title}" · ${s.fields.length} fields · prompt ${prompt.length} chars · memory ${mem.length} chars`);
      log(`CV source: ${cvSource ?? "none found — answers will come from cv.md"}`);
      log(`Planner: ${cliId} (${binPath})`);
      const result = await runPlanner({
        cliId,
        spec,
        binPath,
        prompt,
        fieldCount: s.fields.length,
        cwd: reboundOpsRoot(),
        t0,
        log,
      });

      // Fencing refused to start the planner (#2507): runPlanner already logged
      // the reason; report it as THE error, before the empty-output branch below
      // turns it into an unrelated "produced no output".
      if (result.refused) return fail(result.refused);

      log(`Planner exited code=${result.code} signal=${result.signal} · ${result.buf.length} chars total`);
      log(`output head: ${result.buf.slice(0, 100).replace(/\s+/g, " ") || "(empty)"}`);
      log(`output tail: ${result.buf.slice(-100).replace(/\s+/g, " ") || "(empty)"}`);

      if (!result.buf.trim()) {
        return fail(result.signal ? "planner was killed before producing any output (try again / smaller form)" : "planner produced no output (check the CLI works in this folder)");
      }

      const { obj, truncated } = extractJsonObject(result.buf);
      if (!obj) {
        return fail(
          result.signal ? "planner was killed mid-answer (form too large/slow) — couldn't recover any fields" : "couldn't parse the planner's answer as JSON",
          result.buf.slice(-300),
        );
      }
      const count = Object.keys(obj).length;
      log(`Parsed ${count} answers${truncated ? " (RECOVERED from truncated output — some fields may be missing)" : ""}`);
      // The planner's output is a model draft: sensitive questions come back
      // empty and flagged, off-list options and unknown field ids are dropped.
      finish(obj, { truncated, count });
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
