import { reboundOpsRoot } from "@/lib/rebound-ops";
import { readJsonObject } from "@/lib/json-body";
import { autofillEnabled } from "@/lib/apply/local-model.mjs";
import { ApprovedAnswerError, deleteApproved, readApproved, saveApproved } from "@/lib/apply/approved-answers.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Answers the person saved for reuse on later forms (Autofill, behind the
// `autofill` flag). Stored in data/approved-answers.json; see approved-answers.mjs.
const FIELD_TYPES = new Set(["text", "email", "tel", "url", "number", "date", "textarea", "select", "checkbox", "radio"]);

function off() {
  return Response.json({ error: "Saved answers are part of Autofill, which is off. Set REBOUNDOPS_FEATURES=autofill to use them." }, { status: 404 });
}

function failure(e: unknown) {
  if (e instanceof ApprovedAnswerError) return Response.json({ error: e.message }, { status: e.status });
  return Response.json({ error: "Saved answers could not be changed." }, { status: 500 });
}

export async function GET() {
  if (!autofillEnabled(process.env)) return off();
  try {
    return Response.json(readApproved(reboundOpsRoot()));
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  if (!autofillEnabled(process.env)) return off();
  const body = await readJsonObject<{ revision?: unknown; field?: { label?: unknown; type?: unknown; combobox?: unknown }; value?: unknown; company?: unknown }>(req);
  if (!body) return Response.json({ error: "bad json" }, { status: 400 });
  const { revision, field, value, company } = body;
  if (typeof revision !== "number" || !field || typeof field.label !== "string" || field.label.length > 500 || typeof field.type !== "string" || !FIELD_TYPES.has(field.type)) {
    return Response.json({ error: "Send { revision, field: { label, type }, value, company? }." }, { status: 400 });
  }
  if (typeof value !== "string" || (company !== undefined && company !== null && (typeof company !== "string" || company.length > 200))) {
    return Response.json({ error: "value must be a string; company must be a short string or null." }, { status: 400 });
  }
  try {
    const result = saveApproved(reboundOpsRoot(), {
      revision,
      field: { label: field.label, type: field.type, combobox: field.combobox === true },
      value,
      company: typeof company === "string" ? company : null,
    });
    return Response.json(result, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(req: Request) {
  if (!autofillEnabled(process.env)) return off();
  const body = await readJsonObject<{ revision?: unknown; id?: unknown }>(req);
  if (!body || typeof body.revision !== "number" || typeof body.id !== "string") {
    return Response.json({ error: "Send { revision, id }." }, { status: 400 });
  }
  try {
    return Response.json(deleteApproved(reboundOpsRoot(), { revision: body.revision, id: body.id }));
  } catch (e) {
    return failure(e);
  }
}
