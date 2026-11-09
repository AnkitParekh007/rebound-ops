import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { seedDemo } from "./demo-fixture.mjs";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.dirname(base);
const destination = path.resolve(
  process.env.MARKETING_SCREENSHOTS_DIR ||
    path.join(base, ".generated/screenshots"),
);
const sourceSha =
  process.env.GITHUB_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repo,
    encoding: "utf8",
  }).trim();
if (!/^[a-f0-9]{40}$/.test(sourceSha))
  throw new Error("Screenshot source must be a full Git commit SHA");

if (process.argv.includes("--server")) {
  // Imported only in the isolated child, after its data root and environment are set.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );
    if (!["127.0.0.1", "localhost"].includes(url.hostname))
      return Promise.reject(
        new Error("External requests disabled for screenshot capture"),
      );
    return originalFetch(input, init);
  };
  const { buildApp } = await import('../../dist/api/app.js');
  const recovery = buildApp({ dataDir: path.join(process.env.REBOUND_OPS_ROOT, 'recovery-sessions') });
  await recovery.listen({ host: '127.0.0.1', port: 0 });
  process.env.REBOUNDOPS_API_PORT = String(recovery.server.address().port);
  const { createApp } = await import("../../workspace/server/index.mjs");
  const server = createApp().listen(0, "127.0.0.1", () => {
    process.send({ port: server.address().port });
  });
  process.on("SIGTERM", () => server.close(async () => { await recovery.close(); process.exit(0); }));
} else {
  const { chromium } = await import("@playwright/test");
  const temporary = mkdtempSync(path.join(tmpdir(), "reboundops-marketing-"));
  const dataRoot = path.join(temporary, "demo");
  const staging = path.join(temporary, "captures");
  mkdirSync(staging, { recursive: true });
  seedDemo(dataRoot);
  const environment = { ...process.env };
  for (const key of Object.keys(environment))
    if (/(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(key))
      delete environment[key];
  Object.assign(environment, {
    REBOUND_OPS_ROOT: dataRoot,
    REBOUNDOPS_AI_ENABLED: "false",
    NODE_ENV: "test",
  });
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), "--server"],
    { cwd: repo, env: environment, stdio: ["ignore", "pipe", "pipe", "ipc"] },
  );
  let logs = "";
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk) => {
      logs = (logs + chunk).slice(-6000);
    });
  let browser;
  try {
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Screenshot server startup timed out")),
        30_000,
      );
      child.once("message", (message) => {
        clearTimeout(timeout);
        resolve(message.port);
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`Screenshot server exited (${code}): ${logs}`));
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    const origin = `http://127.0.0.1:${port}`;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "UTC",
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return url.origin === origin || ["data:", "blob:"].includes(url.protocol)
        ? route.continue()
        : route.abort();
    });
    await context.addInitScript(() => {
      localStorage.setItem("theme", "light");
      localStorage.setItem("rebound-ops-ui:lang", "en");
      localStorage.setItem("reboundops:visited", "1");
    });
    const screenshots = [];
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [id, route, readyText] of [
      ['start', 'start', 'What would help you move forward right now?'],
      ['directions', 'directions', 'First small experiment'],
      ['plan', 'recovery', 'Your next step'],
      ['evidence', 'evidence', 'What you can point to'],
      ['dashboard', 'dashboard', 'A search with a direction.'],
      ['scan', 'scan', 'Northstar Example Labs'],
      ['tracker', 'tracker', 'Fieldwork Example Studio'],
    ]) {
      await page.goto(`${origin}/#/${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
      if (id === 'plan') {
        await page.goto(`${origin}/#/directions`, { waitUntil: 'networkidle' });
        await page.locator('[data-route-id="return"] button').click();
        await page.locator('#rj-next-h').waitFor();
      } else {
        await page.locator('#content').getByText(readyText, { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 15_000 });
      }
      await page.evaluate(() => document.fonts.ready);
      if (errors.length)
        throw new Error(`${id}: JavaScript failed: ${errors.join("; ")}`);
      const filename = `${id}.png`;
      const file = path.join(staging, filename);
      await page.screenshot({
        path: file,
        fullPage: false,
        animations: "disabled",
        caret: "hide",
      });
      screenshots.push({
        id,
        filename,
        width: 1440,
        height: 1000,
        sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
      });
      console.log(
        `Captured ${id} from current app (${sourceSha.slice(0, 7)}), synthetic data only.`,
      );
      if (id === 'start') {
        await page.getByRole('button', { name: 'Use a fictional example', exact: true }).click();
        await page.getByRole('button', { name: 'Compare my directions', exact: true }).click();
        await page.waitForURL('**/#/recovery');
        await page.locator('.rj-home').waitFor();
      }

    }
    // Guard the new surfaces on a narrow screen and in both supported themes.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { localStorage.setItem('theme', value); document.documentElement.dataset.theme = value; }, theme);
      for (const route of ['dashboard']) {
        await page.goto(`${origin}/#/${route}`, { waitUntil: 'networkidle' });
        // Hash navigation can resolve before the async router replaces the old tool view.
        // Measure the requested view after it is mounted and laid out.
        await page.locator('[data-testid="search-workbench"]').waitFor();
        await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${route} overflows at 390px in ${theme} theme: ${JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => ({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,text:e.textContent.slice(0,60)})).slice(-15)))}`);
      }
    }
    if (errors.length) throw new Error(errors.join('; '));
    await page.close();
    writeFileSync(
      path.join(staging, "manifest.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          sourceSha,
          capturedAt: new Date().toISOString(),
          screenshots,
        },
        null,
        2,
      ) + "\n",
    );
    // Publish a complete set only after every view rendered successfully.
    mkdirSync(destination, { recursive: true });
    for (const file of [
      ...screenshots.map((shot) => shot.filename),
      "manifest.json",
    ]) {
      const { copyFileSync } = await import("node:fs");
      copyFileSync(path.join(staging, file), path.join(destination, file));
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) resolve();
      else {
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 5000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      }
    });
    rmSync(temporary, { recursive: true, force: true });
  }
}
