import { autofillEnabled, readLocalModelConfig } from "@/lib/apply/local-model.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whether pre-fill can offer the local model drafter (Autofill AF-05). Reads the
// environment only: the model is never contacted here.
export async function GET() {
  if (!autofillEnabled(process.env)) return Response.json({ enabled: false });
  const c = readLocalModelConfig(process.env);
  return Response.json({
    enabled: true,
    state: c.state,
    model: c.state === "not_configured" ? null : c.model,
    endpoint: c.state === "configured" ? c.origin : null,
    detail:
      c.state === "invalid_config" ? c.detail
      : c.state === "not_configured" ? "No local model is configured. Set REBOUNDOPS_LOCAL_MODEL_URL and REBOUNDOPS_LOCAL_MODEL."
      : "Configured. Pre-fill asks it only when you choose it.",
  });
}
