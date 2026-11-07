import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript" };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const fullPath = path.resolve(root, "." + pathname);
    if (!(fullPath === root || fullPath.startsWith(root + path.sep))) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const file = fullPath === root ? path.join(root, "index.html") : fullPath;
    if (![".html", ".css", ".mjs", ".js"].includes(path.extname(file))) {
      response.writeHead(404).end("Not found");
      return;
    }
    if (!(await stat(file)).isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": (types[path.extname(file)] || "text/plain") + "; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.listen(port, "127.0.0.1", () => console.log("ReboundOps pilot: http://127.0.0.1:" + port));
