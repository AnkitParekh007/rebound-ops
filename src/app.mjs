import { ROUTES, buildPlan, parseEvidence, getProgress, exportMarkdown } from "./core.mjs";
import { FICTIONAL_PROFILE } from "./demo.mjs";

const byId = id => document.getElementById(id);
const form = byId("intake-form");
const state = { profile: null, evidence: [], plan: null, completedIds: new Set() };

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function resetJourney() {
  state.profile = null;
  state.evidence = [];
  state.plan = null;
  state.completedIds.clear();
  for (const id of ["routes-section", "plan-section", "review-section"]) byId(id).hidden = true;
  byId("form-message").textContent = "";
  byId("review-notes").value = "";
}
function populate(profile) {
  for (const [key, value] of Object.entries(profile)) {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  }
  resetJourney();
}
function getProfile() {
  const data = new FormData(form);
  const val = key => String(data.get(key) ?? "").trim();
  return {
    role: val("role"), location: val("location"),
    weeklyHours: Number(val("weeklyHours")),
    urgency: val("urgency"), priorities: val("priorities"),
    evidence: val("evidence"), shiftTarget: val("shiftTarget"),
    bridgeTarget: val("bridgeTarget")
  };
}
function renderEvidence() {
  const host = byId("evidence-list");
  host.replaceChildren();
  const heading = node("h3", "", "Evidence to verify");
  host.append(heading);
  if (!state.evidence.length) {
    host.append(node("p", "hint", "No achievements listed yet. A facilitator should help recover documented examples before making claims."));
    return;
  }
  const ul = node("ul", "evidence-list");
  state.evidence.forEach(e => {
    const li = node("li");
    li.append(node("strong", "", e.claim), node("small", "", e.source));
    ul.append(li);
  });
  host.append(ul);
}
function renderRoutes() {
  const host = byId("route-cards");
  host.replaceChildren();
  const titles = {
    return: state.profile.role || "Similar position",
    shift: state.profile.shiftTarget || "Adjacent position",
    bridge: state.profile.bridgeTarget || "Contract opportunity"
  };
  for (const [id, route] of Object.entries(ROUTES)) {
    const card = node("article", "route-card");
    card.append(node("p", "route-type", route.label), node("h3", "", titles[id]), node("p", "", route.subtitle));
    card.append(node("h4", "", "Next question"), node("p", "", route.test));
    card.append(node("h4", "", "What we do not know"), node("p", "", route.risk));
    const btn = node("button", "primary compact", "Test this direction");
    btn.type = "button";
    btn.dataset.route = id;
    card.append(btn);
    host.append(card);
  }
}
function renderPlan() {
  const plan = state.plan;
  byId("plan-budget").textContent = plan.plannedMinutes + " of " + plan.budgetMinutes + " min budgeted";
  const host = byId("plan-list");
  host.replaceChildren();
  for (const action of plan.actions) {
    const item = node("li", "plan-item");
    const label = node("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.action = action.id;
    input.checked = state.completedIds.has(action.id);
    const detail = node("span");
    detail.append(node("small", "task-day", "Day " + action.day + " · " + action.minutes + " minutes"), node("strong", "", action.title));
    label.append(input, detail);
    item.append(label);
    host.append(item);
  }
  renderReview();
}
function renderReview() {
  if (!state.plan) return;
  const progress = getProgress(state.plan, [...state.completedIds]);
  byId("progress-summary").textContent =
    progress.completedCount + " of " + progress.totalCount + " actions completed (" +
    progress.completedMinutes + " / " + progress.plannedMinutes +
    " planned minutes). Use the check-in to record outcomes, not just completed tasks.";
}
function chooseRoute(id) {
  state.plan = buildPlan(id, state.profile.weeklyHours);
  state.completedIds.clear();
  byId("review-notes").value = "";
  renderPlan();
  byId("plan-section").hidden = false;
  byId("review-section").hidden = true;
  byId("routes-message").textContent = "Selected: " + ROUTES[id].label + ". You can change direction at any time.";
  byId("plan-section").scrollIntoView({ behavior: "smooth" });
}
function downloadPlan() {
  if (!state.plan) return;
  const text = exportMarkdown({
    profile: state.profile,
    evidence: state.evidence,
    plan: state.plan,
    completedIds: [...state.completedIds],
    reviewNotes: byId("review-notes").value
  });
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "reboundops-seven-day-plan.md";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const profile = getProfile();
  if (!profile.role || !Number.isFinite(profile.weeklyHours) || profile.weeklyHours < 1 || profile.weeklyHours > 20) {
    byId("form-message").textContent = "Enter a recent role and between 1 and 20 available hours per week.";
    return;
  }
  resetJourney();
  state.profile = profile;
  state.evidence = parseEvidence(profile.evidence);
  renderEvidence();
  renderRoutes();
  byId("routes-section").hidden = false;
  byId("routes-section").scrollIntoView({ behavior: "smooth" });
});
byId("route-cards").addEventListener("click", event => {
  const button = event.target.closest("button[data-route]");
  if (button && state.profile) chooseRoute(button.dataset.route);
});
byId("plan-list").addEventListener("change", event => {
  const box = event.target;
  if (!(box instanceof HTMLInputElement) || !box.dataset.action) return;
  if (box.checked) state.completedIds.add(box.dataset.action);
  else state.completedIds.delete(box.dataset.action);
  renderReview();
});
byId("show-review").addEventListener("click", () => {
  byId("review-section").hidden = false;
  byId("review-section").scrollIntoView({ behavior: "smooth" });
});
byId("revisit").addEventListener("click", () => {
  byId("routes-section").scrollIntoView({ behavior: "smooth" });
});
byId("export-plan").addEventListener("click", downloadPlan);
byId("export-reviewed").addEventListener("click", downloadPlan);
byId("load-demo").addEventListener("click", () => { populate(FICTIONAL_PROFILE); byId("form-message").textContent = "Fictional example loaded — you can edit every field."; });
byId("clear-all").addEventListener("click", () => { form.reset(); for (const input of form.querySelectorAll("input:not([type=number]), textarea")) input.value = ""; resetJourney(); byId("form-message").textContent = "Cleared. Nothing has been saved."; });
populate(FICTIONAL_PROFILE);
byId("form-message").textContent = "Fictional example loaded. Edit it or select Clear everything to start fresh.";
