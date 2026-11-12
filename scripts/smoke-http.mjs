/**
 * Plain `node:http` GET for the smoke scripts' own requests to the local server.
 *
 * Node's `fetch` (undici) can throw from a socket event handler while a server
 * is starting, outside the promise it returned, so `try/catch` around `fetch`
 * cannot catch it and the whole smoke process exits. CI saw this on macOS with
 * Node 24.22.2: "Error: setTypeOfService EINVAL" from undici's writeH1 during
 * readiness polling. `node:http` reports every failure through the request's
 * 'error' event, which this helper turns into a rejection.
 *
 * @param {string} url
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<{ status: number, ok: boolean, body: string, json: () => any }>}
 */
import http from 'node:http';

export function httpGet(url, { timeoutMs = 5_000 } = {}) {
  return new Promise((resolveGet, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      fn(value);
    };
    const request = http.get(url, { agent: false }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('error', (error) => finish(reject, error));
      response.on('end', () => {
        const status = response.statusCode ?? 0;
        finish(resolveGet, { status, ok: status >= 200 && status < 300, body, json: () => JSON.parse(body) });
      });
    });
    // An absolute deadline, not an idle timeout: a response that keeps sending
    // chunks but never ends must still settle, so the polling loops stay bounded.
    const deadline = setTimeout(() => {
      const error = new Error(`GET ${url} did not complete within ${timeoutMs} ms`);
      request.destroy(error);
      finish(reject, error);
    }, timeoutMs);
    request.on('error', (error) => finish(reject, error));
  });
}
