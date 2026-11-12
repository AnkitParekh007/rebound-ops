import { fillSession, handoffSession, getSession } from "@/lib/apply/session";
import { resolveSessionCv } from "@/lib/apply/cv";
import type { ApplyField } from "@/lib/apply/extract";
import { autofillEnabled } from "@/lib/apply/local-model.mjs";
import { readJsonObject } from "@/lib/json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Fill the real form behind the scenes (headed-but-off-screen), screenshotting
// each step for the "behind the scenes" strip, then bring the window to the front
// so the HUMAN reviews and submits. NEVER submits — there is no submit path here.
export async function POST(req: Request) {
  const body = await readJsonObject<{ sessionId?: string; answers?: Record<string, string>; fields?: ApplyField[]; handoff?: boolean; company?: string; application?: string }>(req);
  if (!body) return Response.json({ error: "bad json" }, { status: 400 });
  const { sessionId, answers = {}, fields = [], handoff, company, application } = body;
  if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 });
  if (company !== undefined && typeof company !== "string") {
    return Response.json({ error: "company must be a string" }, { status: 400 });
  }
  if (application !== undefined && typeof application !== "string") {
    return Response.json({ error: "application must be a string" }, { status: 400 });
  }

  // Resolve the tailored CV server-side (never trust a client path): by the
  // offer's company if known, else best-effort from the form title.
  const session = getSession(sessionId);
  const cvPath = (await resolveSessionCv({ company, application, title: session?.title })) ?? undefined;

  try {
    // Per-field readback results reach the review screen only with the
    // `autofill` flag; without it the fill reports what it always did.
    const readback = autofillEnabled(process.env);
    const { results, ...result } = await fillSession(sessionId, answers, fields, cvPath, { differences: readback });
    if (handoff) await handoffSession(sessionId).catch(() => {});
    return Response.json({ ...result, ...(readback ? { results } : {}), handedOff: !!handoff, cvAttached: !!cvPath });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message.slice(0, 200) : "fill failed" }, { status: 500 });
  }
}
