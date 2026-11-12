import { readbackSession } from "@/lib/apply/session";
import { autofillEnabled } from "@/lib/apply/local-model.mjs";
import type { ApplyField } from "@/lib/apply/extract";
import { readJsonObject } from "@/lib/json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELD_TYPES = new Set(["text", "email", "tel", "url", "number", "date", "textarea", "select", "checkbox", "radio", "file"]);

function isField(f: unknown): f is ApplyField {
  const r = f as Record<string, unknown>;
  return !!f && typeof r.id === "string" && typeof r.type === "string" && FIELD_TYPES.has(r.type) && (r.label === undefined || typeof r.label === "string");
}

// Per-field FillResult readback (R1 Autofill, behind the `autofill` flag):
// read the real form back after the agent filled it, and say per field whether
// the reviewed answer is what the form shows. Only reads the page: no click,
// no typing, never submits.
export async function POST(req: Request) {
  if (!autofillEnabled(process.env)) return Response.json({ error: "not found" }, { status: 404 });
  const body = await readJsonObject<{ sessionId?: unknown; answers?: unknown; fields?: unknown }>(req);
  if (!body) return Response.json({ error: "bad json" }, { status: 400 });
  const { sessionId, answers = {}, fields = [] } = body;
  if (typeof sessionId !== "string" || !sessionId) return Response.json({ error: "sessionId required" }, { status: 400 });
  if (!Array.isArray(fields) || !fields.every(isField)) return Response.json({ error: "fields must be form fields" }, { status: 400 });
  if (!answers || typeof answers !== "object" || Array.isArray(answers) || !Object.values(answers).every((v) => typeof v === "string")) {
    return Response.json({ error: "answers must map field ids to text" }, { status: 400 });
  }
  try {
    return Response.json(await readbackSession(sessionId, answers as Record<string, string>, fields));
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 200) : "readback failed";
    return Response.json({ error: message }, { status: /not found/.test(message) ? 404 : 500 });
  }
}
