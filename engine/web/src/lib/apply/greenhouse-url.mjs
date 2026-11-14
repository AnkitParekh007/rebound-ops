/**
 * Greenhouse job-board URLs, parsed without a network call. Plain .mjs so the
 * apply queue (apply-queue.mjs) and `node --test` can use it; greenhouse.ts
 * re-exports it for the session.
 */

/**
 * A Greenhouse job-board URL → {token, jobId}, else null.
 * @param {string} url
 * @returns {{ token: string, jobId: string } | null}
 */
export function parseGreenhouse(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)greenhouse\.io$/i.test(u.hostname)) return null;
    // .../{token}/jobs/{id}  (job-boards.greenhouse.io or boards.greenhouse.io)
    const m = u.pathname.match(/\/([^/]+)\/jobs\/(\d+)/);
    if (m) return { token: m[1], jobId: m[2] };
    // embed form: boards.greenhouse.io/embed/job_app?for={token}&token={id}
    const forToken = u.searchParams.get("for");
    const jobId = u.searchParams.get("token");
    if (forToken && jobId) return { token: forToken, jobId };
    return null;
  } catch {
    return null;
  }
}
