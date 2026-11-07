import { reboundOpsRoot, isRegularContainedFile } from "@/lib/rebound-ops";
import { resolvePdfIndexPath } from "@/lib/core/pdf-index";
import { handleDocumentsRequest } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const root = reboundOpsRoot();
  const manifestPath = await resolvePdfIndexPath();
  return handleDocumentsRequest(req, root, manifestPath, isRegularContainedFile);
}
