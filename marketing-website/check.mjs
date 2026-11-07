import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { pages } from "./src/pages.mjs";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("./dist", import.meta.url));
const siteBase = (process.env.MARKETING_BASE_PATH || "").replace(/\/$/, "");
const files = [
  "index.html",
  "404.html",
  ...Object.keys(pages).map(slug => `${slug}/index.html`),
];
for (const file of files) {
  const html = readFileSync(path.join(root, file), "utf8");
  assert(!/href="[^"#]*\/credits\//i.test(html), `${file}: retired credits link`);
  assert(!/career-?ops/i.test(html), `${file}: prominent upstream branding`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: unique IDs`);
  for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (href.startsWith("#") && href.length > 1)
      assert(ids.includes(href.slice(1)), `${file}: ${href}`);
    if (href.startsWith("/")) {
      let [pathname, fragment] = href.split("#");
      pathname = pathname.split("?")[0];
      if (siteBase) {
        assert(
          pathname === siteBase + "/" || pathname.startsWith(siteBase + "/"),
          `${file}: unprefixed URL ${href}`,
        );
        pathname = pathname.slice(siteBase.length);
      }
      const target = path.join(
        root,
        pathname.endsWith("/") ? pathname + "index.html" : pathname,
      );
      assert(existsSync(target), `${file}: missing ${href}`);
      if (fragment)
        assert(
          readFileSync(target, "utf8").includes(`id="${fragment}"`),
          `${file}: missing fragment ${href}`,
        );
    }
  }
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${file}: one H1`);
  assert.equal(
    (html.match(/<nav aria-label="Main navigation"/g) || []).length,
    1,
  );
  assert(html.includes("/theme.js"), `${file}: theme available`);
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g))
    assert(/\balt=/.test(tag));
  if (!["index.html", "404.html"].includes(file))
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
}
assert(!existsSync(path.join(root, 'credits/index.html')), 'Credits page must be removed');
assert(!readFileSync(path.join(root, 'sitemap.xml'), 'utf8').includes('/credits/'), 'Sitemap excludes retired page');
assert.equal(files.length, Object.keys(pages).length + 2, "All published pages checked");
class Element {
  constructor(data = {}) {
    this.dataset = data;
    this.attrs = {};
    this.textContent = "";
    this.children = [];
    this.listeners = {};
    this.value = "";
    this.hidden = false;
    this.classes = new Set();
    this.classList = {
      toggle: (name, on) =>
        on ? this.classes.add(name) : this.classes.delete(name),
      remove: (name) => this.classes.delete(name),
      add: (...names) => names.forEach((name) => this.classes.add(name)),
    };
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  getAttribute(k) {
    return this.attrs[k];
  }
  addEventListener(k, f) {
    this.listeners[k] = f;
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  replaceChildren() {
    this.children = [];
  }
  focus() {
    this.focused = true;
  }
}
const routeButtons = ["return", "shift", "bridge"].map(
  (route) => new Element({ route }),
);
const viewButtons = ["discover", "prepare", "track"].map(
  (view) => new Element({ view }),
);
const copyButtons = ["clone", "start"].map((copy) => new Element({ copy }));
const shotButtons = ["start", "directions", "plan", "evidence", "dashboard", "scan", "tracker"].map(
  (shot) => new Element({ shot }),
);
const filters = ["all", "ats", "remote", "specialist"].map(
  (sourceFilter) => new Element({ sourceFilter }),
);
const cards = [
  new Element({ sourceName: "greenhouse", sourceCategory: "ats" }),
  new Element({ sourceName: "remotive", sourceCategory: "remote" }),
  new Element({ sourceName: "itviec", sourceCategory: "specialist" }),
];
const elements = new Map();
for (const file of files)
  for (const [, id] of readFileSync(path.join(root, file), "utf8").matchAll(
    /\bid="([^"]+)"/g,
  ))
    elements.set(id, new Element());
const menu = new Element();
let copied = "";
const selectors = {
  "[data-route]": routeButtons,
  "[data-view]": viewButtons,
  "[data-copy]": copyButtons,
  "[data-shot]": shotButtons,
  "[data-source-filter]": filters,
  "[data-source-name]": cards,
};
const document = {
  getElementById: (id) => elements.get(id) || null,
  querySelectorAll: (s) => selectors[s] || [],
  querySelector: (selector) =>
    selector.includes("reboundops-base-path")
      ? { getAttribute: () => siteBase }
      : menu,
  addEventListener() {},
  createElement: () => new Element(),
};
vm.runInNewContext(readFileSync(path.join(root, "site.js"), "utf8"), {
  document,
  window: { matchMedia: () => ({ matches: true }) },
  navigator: {
    clipboard: {
      writeText: async (value) => {
        copied = value;
      },
    },
  },
  setTimeout: () => {},
});
for (const [index, button] of routeButtons.entries()) {
  button.listeners.click();
  assert.equal(button.attrs["aria-pressed"], "true");
  assert.equal(
    routeButtons.filter((x) => x.attrs["aria-pressed"] === "true").length,
    1,
  );
  assert.equal(elements.get("plan-list").children.length, 3);
  assert.equal(
    elements.get("plan-time").textContent,
    [
      "2h 05m of example actions",
      "2h 15m of example actions",
      "1h 55m of example actions",
    ][index],
  );
}
for (const button of viewButtons) {
  button.listeners.click();
  assert.equal(elements.get("workspace-content").children.length, 3);
  assert.equal(
    viewButtons.filter((x) => x.attrs["aria-pressed"] === "true").length,
    1,
  );
}
menu.listeners.click();
assert.equal(menu.attrs["aria-expanded"], "true");
menu.listeners.click();
assert.equal(menu.attrs["aria-expanded"], "false");
await copyButtons[0].listeners.click();
assert.equal(
  copied,
  "git clone https://github.com/AnkitParekh007/rebound-ops.git",
);
await copyButtons[1].listeners.click();
assert.equal(copied, "cd rebound-ops\nscripts/start-demo.sh");
shotButtons[0].dataset.shotFile = "start-0123456789ab.png";
for (const button of shotButtons) {
  button.listeners.click();
  assert.equal(
    elements.get("shot-image").src,
    `${siteBase}/assets/${button.dataset.shotFile || `${button.dataset.shot}.png`}`,
  );
  assert.equal(
    shotButtons.filter((x) => x.attrs["aria-pressed"] === "true").length,
    1,
  );
  assert(elements.get("shot-image").alt);
}
filters[2].listeners.click();
assert.equal(cards.filter((card) => !card.hidden).length, 1);
assert.equal(cards[1].hidden, false);
elements.get("source-search").value = "green";
elements.get("source-search").listeners.input();
assert.equal(elements.get("source-empty").hidden, false);
filters[0].listeners.click();
assert.equal(cards[0].hidden, false);
assert.equal(cards.filter((card) => !card.hidden).length, 1);
elements.get("source-search").value = "";
elements.get("source-search").listeners.input();
assert.equal(cards.filter((card) => !card.hidden).length, 3);
// Theme initialization, persistence, system tracking and blocked storage.
function themeHarness(stored, dark, blocked = false) {
  const root = new Element();
  const button = new Element();
  const meta = new Element();
  const events = {};
  const media = {
    matches: dark,
    addEventListener: (type, fn) => (events.media = fn),
  };
  const memory = new Map(stored ? [["reboundops-theme", stored]] : []);
  const doc = {
    documentElement: root,
    querySelector: (s) => (s === ".theme-toggle" ? button : meta),
    addEventListener: (type, fn) => (events[type] = fn),
  };
  const win = {
    matchMedia: () => media,
    addEventListener: (type, fn) => (events[type] = fn),
  };
  const storage = {
    getItem: (key) => {
      if (blocked) throw Error();
      return memory.get(key);
    },
    setItem: (key, value) => {
      if (blocked) throw Error();
      memory.set(key, value);
    },
  };
  vm.runInNewContext(readFileSync(path.join(rootPath, "theme.js"), "utf8"), {
    document: doc,
    window: win,
    localStorage: storage,
  });
  events.DOMContentLoaded();
  return { root, button, meta, events, memory };
}
const rootPath = root;
const saved = themeHarness("dark", false);
assert.equal(saved.root.dataset.theme, "dark");
saved.button.listeners.click();
assert.equal(saved.root.dataset.theme, "light");
assert.equal(saved.memory.get("reboundops-theme"), "light");
assert.equal(saved.button.attrs["aria-label"], "Switch to dark theme");
const system = themeHarness(null, false);
system.events.media({ matches: true });
assert.equal(system.root.dataset.theme, "dark");
system.events.storage({ key: "reboundops-theme", newValue: "light" });
assert.equal(system.root.dataset.theme, "light");
const blocked = themeHarness(null, true, true);
blocked.button.listeners.click();
assert.equal(blocked.root.dataset.theme, "light");
const invalid = themeHarness("invalid", false);
assert.equal(invalid.root.dataset.theme, "light");
assert(
  /prefers-reduced-motion:\s*reduce/.test(
    readFileSync(path.join(root, "styles.css"), "utf8"),
  ),
);
console.log(
  "Passed: all published pages, navigation and assets, previews and totals, clipboard, mobile menu, gallery, source search/filter combinations, theme persistence/system sync/blocked storage, reduced-motion rules.",
);
