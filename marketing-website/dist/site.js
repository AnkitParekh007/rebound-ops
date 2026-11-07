"use strict";
const routes = {
  return: {
    label: "RETURN",
    title: "Build on your strengths.",
    description:
      "Start with what you can demonstrate. Use it to make your next conversation more specific.",
    tasks: [
      ["Verify three achievements with their sources", 30],
      ["Compare two roles against your evidence", 45],
      ["Revise one application asset", 50],
    ],
  },
  shift: {
    label: "SHIFT",
    title: "Make space for something new.",
    description:
      "Explore an adjacent role. Identify what transfers, then choose one gap you can test with a small piece of work.",
    tasks: [
      ["Inventory verified transferable work", 30],
      ["Compare two adjacent-role descriptions", 45],
      ["Outline a small proof of work", 60],
    ],
  },
  bridge: {
    label: "BRIDGE",
    title: "Build a bridge to what’s next.",
    description:
      "Explore a narrow deliverable you can already offer. Test the scope and interest before making assumptions about income.",
    tasks: [
      ["List deliverables you can already produce", 30],
      ["Define a narrow contract scope", 40],
      ["Prepare a non-confidential work example", 45],
    ],
  },
};
for (const button of document.querySelectorAll("[data-route]"))
  button.addEventListener("click", () => {
    const route = routes[button.dataset.route];
    for (const item of document.querySelectorAll("[data-route]")) {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    }
    document.getElementById("route-label").textContent =
      "DIRECTION / " + route.label;
    document.getElementById("route-title").textContent = route.title;
    document.getElementById("route-description").textContent =
      route.description;
    const list = document.getElementById("plan-list");
    list.replaceChildren();
    route.tasks.forEach(([title, minutes], index) => {
      const row = document.createElement("div");
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const text = document.createElement("p");
      text.textContent = title;
      const duration = document.createElement("small");
      duration.textContent = minutes + " min";
      row.append(number, text, duration);
      list.append(row);
    });
    const minutes = route.tasks.reduce((total, task) => total + task[1], 0);
    document.getElementById("plan-time").textContent =
      Math.floor(minutes / 60) +
      "h " +
      String(minutes % 60).padStart(2, "0") +
      "m of example actions";
  });
const views = {
  discover: {
    rows: [
      [
        "N",
        "Senior Software Engineer",
        "Northstar Labs · Fictional opportunity",
        "To explore",
      ],
      [
        "F",
        "Platform Engineer",
        "Fieldwork · Fictional opportunity",
        "To explore",
      ],
      [
        "O",
        "Engineering Lead",
        "Orbit Studio · Fictional opportunity",
        "To explore",
      ],
    ],
    caption: "Discover opportunities from public job-board APIs.",
  },
  prepare: {
    rows: [
      [
        "C",
        "A CV grounded in your experience",
        "CV tools · Review every claim",
        "Prepare",
      ],
      [
        "I",
        "Walk into the conversation prepared",
        "Interview preparation · Your own stories",
        "Prepare",
      ],
      [
        "R",
        "Read the role before you commit",
        "Research tools · Understand the opportunity",
        "Prepare",
      ],
    ],
    caption: "Bring structure to CV work, research and interview preparation.",
  },
  track: {
    rows: [
      [
        "N",
        "Senior Software Engineer",
        "Northstar Labs · Fictional application",
        "Draft",
      ],
      [
        "F",
        "Platform Engineer",
        "Fieldwork · Fictional application",
        "Applied",
      ],
      [
        "O",
        "Engineering Lead",
        "Orbit Studio · Fictional application",
        "Interview",
      ],
    ],
    caption: "Keep application statuses, notes and follow-ups in one place.",
  },
};
for (const button of document.querySelectorAll("[data-view]"))
  button.addEventListener("click", () => {
    for (const item of document.querySelectorAll("[data-view]")) {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    }
    const view = views[button.dataset.view];
    const content = document.getElementById("workspace-content");
    content.replaceChildren();
    view.rows.forEach(([letter, title, description, status], index) => {
      const row = document.createElement("div");
      row.className = "job-row";
      const icon = document.createElement("span");
      icon.className = "company-letter " + ["", "sage", "sand"][index];
      icon.textContent = letter;
      const text = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = title;
      const detail = document.createElement("small");
      detail.textContent = description;
      text.append(heading, detail);
      const badge = document.createElement("span");
      badge.className = "job-status";
      badge.textContent = status;
      row.append(icon, text, badge);
      content.append(row);
    });
    document.getElementById("workspace-caption").textContent = view.caption;
  });
const menu = document.querySelector(".menu-toggle");
const nav = document.getElementById("navigation");
function closeMenu() {
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", "Open navigation");
  nav.classList.remove("open");
}
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
  nav.classList.toggle("open", open);
});
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    closeMenu();
    menu.focus();
  }
});
const commands = {
  clone: "git clone https://github.com/AnkitParekh007/rebound-ops.git",
  start: "cd rebound-ops\nscripts/start-demo.sh",
};
for (const button of document.querySelectorAll("[data-copy]"))
  button.addEventListener("click", async () => {
    const command = commands[button.dataset.copy];
    try {
      await navigator.clipboard.writeText(command);
      button.textContent = "Copied ✓";
      document.getElementById("copy-status").textContent =
        "Command copied to clipboard.";
      setTimeout(() => {
        button.textContent = "Copy ↗";
      }, 2200);
    } catch {
      const code = button.closest(".install-label").nextElementSibling;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "Selected";
      document.getElementById("copy-status").textContent =
        "Clipboard unavailable. Command selected; use your device’s copy shortcut.";
    }
  });

// Product gallery: app captures refreshed by CI; local builds retain bundled examples.
const siteBase =
  document
    .querySelector('meta[name="reboundops-base-path"]')
    ?.getAttribute("content") || "";
const shots = {
  start: {"title": "Begin with your own experience.", "description": "Set a goal and describe your experience and constraints. This capture uses a fictional example.", "alt": "ReboundOps intake with goal choices and an option to use a fictional example"},
  directions: {"title": "Choose a direction to test.", "description": "Compare possible routes with their assumptions and unknowns. These are hypotheses, not hiring predictions.", "alt": "ReboundOps directions showing return, shift and stepping-stone routes"},
  plan: {"title": "Make the next week manageable.", "description": "A bounded seven-day plan turns the selected direction into actions. This is synthetic example data.", "alt": "ReboundOps recovery plan showing a next action and a seven-day plan"},
  evidence: {"title": "Know what supports your story.", "description": "Review achievement claims yourself. Confirmation records your review, not external verification.", "alt": "ReboundOps evidence ledger with fictional achievements and review controls"},
  dashboard: {"title": "A search with a direction.", "description": "The ReboundOps workbench connects your next recovery action with application decisions. Records shown are fictional.", "alt": "ReboundOps search workbench showing evidence, decisions and example application records"},

  scan: {
    title: "Discover opportunities.",
    description:
      "Filter the scan results by role, stack and seniority. The visible companies and opportunities are demo fixtures.",
    alt: "ReboundOps scan view with stack and level filters and fictional job listings",
  },
  tracker: {
    title: "Keep the whole search in view.",
    description:
      "See application statuses, notes and follow-up context together. Companies, scores and outcomes in this capture are fictional demo data.",
    alt: "ReboundOps tracker showing fictional companies and example application statuses",
  },

};
for (const button of document.querySelectorAll("[data-shot]"))
  button.addEventListener("click", () => {
    const key = button.dataset.shot;
    const shot = shots[key];
    for (const item of document.querySelectorAll("[data-shot]"))
      item.setAttribute("aria-pressed", String(item === button));
    const image = document.getElementById("shot-image");
    image.src = `${siteBase}/assets/${button.dataset.shotFile || `${key}.png`}`;
    image.alt = shot.alt;
    const link = document.getElementById("shot-link");
    link.href = image.src;
    link.setAttribute(
      "aria-label",
      `Open full-size ${key} screenshot in a new tab`,
    );
    document.getElementById("shot-title").textContent = shot.title;
    document.getElementById("shot-description").textContent = shot.description;
  });

const sourceSearch = document.getElementById("source-search");
if (sourceSearch) {
  let category = "all";
  const cards = [...document.querySelectorAll("[data-source-name]")];
  function filterSources() {
    const query = sourceSearch.value.trim().toLowerCase();
    let count = 0;
    for (const card of cards) {
      card.hidden = !(
        card.dataset.sourceName.includes(query) &&
        (category === "all" || card.dataset.sourceCategory === category)
      );
      if (!card.hidden) count++;
    }
    document.getElementById("source-count").textContent =
      `${count} source${count === 1 ? "" : "s"} in this selection`;
    document.getElementById("source-empty").hidden = count > 0;
  }
  sourceSearch.addEventListener("input", filterSources);
  for (const button of document.querySelectorAll("[data-source-filter]"))
    button.addEventListener("click", () => {
      category = button.dataset.sourceFilter;
      for (const item of document.querySelectorAll("[data-source-filter]"))
        item.setAttribute("aria-pressed", String(item === button));
      filterSources();
    });
}

// Motion is progressive enhancement; all content stays visible if unsupported.
if (
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          entry.target.classList.remove("reveal-pending");
          observer.unobserve(entry.target);
        }
    },
    { threshold: 0.06 },
  );
  for (const element of document.querySelectorAll(
    ".section-heading, .content-card, .steps-list article, .plan-preview, .workspace-showcase, .page-hero h1",
  )) {
    element.classList.add("reveal", "reveal-pending");
    observer.observe(element);
  }
}
