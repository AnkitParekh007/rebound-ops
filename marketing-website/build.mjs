import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  rmSync,
  existsSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import { navigation, pages, providerIds } from "./src/pages.mjs";
import { loadScreenshotSet } from "./scripts/screenshot-artifacts.mjs";
const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, "..");
const output = path.join(base, "dist");
const assetVersions = Object.fromEntries(
  ["styles.css", "site.js", "theme.js"].map((file) => [
    file,
    createHash("sha256")
      .update(readFileSync(path.join(base, "src", file)))
      .digest("hex")
      .slice(0, 12),
  ]),
);

const siteBase = (process.env.MARKETING_BASE_PATH || "").replace(/\/$/, "");
if (siteBase && !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(siteBase))
  throw new Error("Invalid marketing base path");
const withBase = (html) =>
  html.replace(/(href|src)="\/(?!\/)/g, `$1="${siteBase}/`);

const screenshotsDirectory = process.env.MARKETING_SCREENSHOTS_DIR;
if (
  process.env.MARKETING_REQUIRE_FRESH_SCREENSHOTS === "true" &&
  !screenshotsDirectory
)
  throw new Error("This build requires fresh screenshots");
const screenshotSet = screenshotsDirectory
  ? loadScreenshotSet(
      path.resolve(screenshotsDirectory),
      process.env.GITHUB_SHA,
    )
  : null;

for (const id of providerIds)
  if (!existsSync(path.join(root, `engine/providers/${id}.mjs`)))
    throw new Error(`Missing source adapter: ${id}`);
const navGroups = [
  ["Explore", navigation.slice(0, 3)],
  ["Understand", navigation.slice(3, 6)],
  ["Support", navigation.slice(6)],
];
const installUrl = "/docs/getting-started/#install";
const header = (active) =>
  `<header class="header"><div class="container nav"><a href="/" class="wordmark" aria-label="ReboundOps home"><img src="/assets/mark.png" width="32" height="32" alt="">rebound<span>ops</span></a><nav aria-label="Main navigation" id="navigation"><a id="menu-install" class="menu-install" href="${installUrl}">Install locally</a>${navGroups.map(([label, links]) => `<div class="nav-group"><p class="nav-group-label">${label}</p>${links.map(([slug, title]) => `<a href="/${slug}/"${slug === 'docs' && active.startsWith('docs') ? ' aria-current="location"' : active === slug ? ' aria-current="page"' : ""}>${title}</a>`).join("")}</div>`).join("")}</nav><a class="nav-cta" href="${installUrl}">Install locally</a><button class="theme-toggle" type="button" aria-label="Switch theme" aria-pressed="false"><svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/></svg><svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg></button><button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="navigation">☰</button></div></header>`;
const repo = "https://github.com/AnkitParekh007/rebound-ops";
const footer = `<footer class="footer container">
  <div class="footer-top"><a href="/" class="wordmark" aria-label="ReboundOps home"><img src="/assets/mark.png" width="30" height="30" alt="">rebound<span>ops</span></a><p>Open-source tools for your next career move.</p></div>
  <nav class="footer-links" aria-label="Footer navigation">
    <div><strong>Product</strong><a href="${installUrl}">Install locally</a><a href="/screenshots/">App Preview</a><a href="/docs/">User Guide</a></div>
    <div><strong>Support</strong><a href="/faq/">Questions</a><a href="${repo}/issues">Report an issue</a><a href="/docs/data/">Data and privacy</a></div>
    <div><strong>Project</strong><a href="${repo}">GitHub</a><a href="/docs/contributing/">Contribute</a><a href="${repo}/blob/main/LICENSE">MIT license</a><a href="${repo}/blob/main/SECURITY.md">Report a security issue</a></div>
  </nav>
  <div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} ReboundOps · Maintained by Ankit Parekh</span><span>Open source. Human direction.</span></div>
</footer>`;
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
function withScreenshotAssets(markup) {
  for (const shot of screenshotSet?.screenshots ?? []) {
    markup = markup.replaceAll(`/assets/${shot.filename}`, `/assets/${shot.id}-${shot.sha256.slice(0, 12)}.png`);
  }
  return markup;
}
function page(slug, title, description, main) {
  const url = "https://rebound-ops.org/" + (slug ? slug + "/" : "");
  return withBase(
    `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="theme-color" content="#ffffff"><meta name="reboundops-base-path" content="${siteBase}"><link rel="icon" href="/assets/favicon.png"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://rebound-ops.org/assets/social-card.svg"><meta name="twitter:card" content="summary_large_image"><script src="/theme.js?v=${assetVersions["theme.js"]}"></script><link rel="stylesheet" href="/styles.css?v=${assetVersions["styles.css"]}"><script src="/site.js?v=${assetVersions["site.js"]}" defer></script></head><body><a class="skip" href="#main">Skip to content</a>${header(slug)}${main.replace('id="main"', 'id="main" tabindex="-1"')}${footer}</body></html>`,
  );
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(path.join(base, "public"), output, { recursive: true });
if (screenshotSet) {
  for (const shot of screenshotSet.screenshots) {
    const hashedName = `${shot.id}-${shot.sha256.slice(0, 12)}.png`;
    cpSync(
      path.join(screenshotsDirectory, shot.filename),
      path.join(output, "assets", shot.filename),
    );
    cpSync(
      path.join(screenshotsDirectory, shot.filename),
      path.join(output, "assets", hashedName),
    );
    shot.publicPath = `${siteBase}/assets/${hashedName}`;
  }
  writeFileSync(
    path.join(output, "screenshots-manifest.json"),
    JSON.stringify(screenshotSet, null, 2) + "\n",
  );
}

for (const file of ["styles.css", "site.js", "theme.js"])
  cpSync(path.join(base, "src", file), path.join(output, file));
writeFileSync(
  path.join(output, "index.html"),
  page(
    "",
    "ReboundOps — Build a seven-day career plan",
    "Evidence-led career recovery and a focused local job search. Open-source tools, optional AI and a practical seven-day action plan.",
    withScreenshotAssets(readFileSync(path.join(base, "src/home.html"), "utf8")),
  ),
);
for (const [slug, data] of Object.entries(pages)) {
  let content = withScreenshotAssets(data.content);
  if (slug === "screenshots") {
    if (screenshotSet)
      for (const shot of screenshotSet.screenshots) {
        const hashedName = `${shot.id}-${shot.sha256.slice(0, 12)}.png`;
        content = content.replace(
          `data-shot="${shot.id}"`,
          `data-shot="${shot.id}" data-shot-file="${hashedName}"`,
        );
      }

    const note = screenshotSet
      ? `Automatically captured from app commit <a href="https://github.com/AnkitParekh007/rebound-ops/commit/${screenshotSet.sourceSha}">${screenshotSet.sourceSha.slice(0, 7)}</a> on ${new Date(screenshotSet.capturedAt).toISOString().slice(0, 10)} (UTC). All profile, company and application data is fictional. These are product demonstrations, not customer outcomes.`
      : "These bundled repository demo captures are a fallback for local builds. Production automation requires fresh, commit-matched captures. All displayed companies, scores and outcomes are demo data.";
    content = content.replace("<!-- SCREENSHOT_BUILD_NOTE -->", note);
    if (screenshotSet)
      content = content.replace(
        'width="2880" height="1800"',
        'width="1440" height="1000"',
      );
  }

  mkdirSync(path.join(output, slug), { recursive: true });
  const main = data.documentation ? `<main id="main" class="container docs-main">${content}</main>` : `<main id="main"><section class="page-hero"><div class="container"><div class="breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>${data.title}</span></div><div class="eyebrow"><span class="status-dot"></span>${data.eyebrow}</div><h1>${data.heading}</h1><p>${data.description}</p></div></section><div class="page-content container">${content}<section class="page-cta"><div><h2>Your next move starts locally.</h2><p>Open source. Optional AI. You set the direction.</p></div><a class="button primary" href="${installUrl}">Install locally</a></section></div></main>`;
  writeFileSync(
    path.join(output, slug, "index.html"),
    page(slug, `${data.title} — ReboundOps`, data.description, main),
  );
}
writeFileSync(
  path.join(output, "404.html"),
  page(
    "",
    "Page not found — ReboundOps",
    "Find your way back to the ReboundOps toolkit.",
    '<main id="main" class="container page-hero"><div class="eyebrow">404 / OFF THE PATH</div><h1>A different<br><span class="orange">direction?</span></h1><p>This page could not be found. Head back to the toolkit or check the setup guide.</p><div class="hero-actions"><a class="button primary" href="/">Back to home ↗</a><a class="text-link" href="/help/">Setup help</a></div></main>',
  ),
);
writeFileSync(
  path.join(output, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["", ...Object.keys(pages)].map((slug) => `<url><loc>https://rebound-ops.org/${slug ? slug + "/" : ""}</loc></url>`).join("")}</urlset>\n`,
);
console.log(
  `Built home, ${Object.keys(pages).length} content pages, 404, shared assets and sitemap.`,
);
