/** Deterministic manual-pilot logic. No AI or external requests. */
export const ROUTES = Object.freeze({
  return: {
    label: "Return",
    subtitle: "Re-enter a role close to your recent work",
    test: "Can you demonstrate relevant, recent outcomes for the target role?",
    risk: "Your evidence may not map to current job requirements until you compare actual descriptions."
  },
  shift: {
    label: "Shift",
    subtitle: "Test an adjacent role using transferable experience",
    test: "Which one missing requirement can you verify or demonstrate with a small work sample?",
    risk: "Adjacent experience does not itself prove readiness for a new specialty."
  },
  bridge: {
    label: "Bridge",
    subtitle: "Explore scoped contract or temporary work",
    test: "Can you define a deliverable and find a legitimate buyer without overcommitting?",
    risk: "Availability, rates and time to income are unknown."
  }
});

const TASKS = Object.freeze({
  return: [
    ["Record three evidence-backed achievements and note their sources", 30],
    ["Compare two recent job descriptions against your evidence", 45],
    ["Improve one résumé bullet or short case study with verifiable outcomes", 50],
    ["Prepare one focused application or targeted conversation", 50],
    ["Review responses and choose next week's adjustment", 25]
  ],
  shift: [
    ["List transferable achievements and unverified requirements", 30],
    ["Read two job descriptions and choose one concrete gap to test", 45],
    ["Outline or build a tiny proof-of-work demonstrating the gap", 60],
    ["Get feedback on your example from a practitioner", 45],
    ["Record the outcome and update the hypothesis", 20]
  ],
  bridge: [
    ["List deliverables you can produce with existing skills", 30],
    ["Define a narrow offer, scope, assumptions and boundaries", 40],
    ["Prepare a one-page example of prior work (no confidential content)", 45],
    ["Contact one appropriate person or review one legitimate opportunity", 50],
    ["Assess interest and adjust the offer", 20]
  ]
});

export function normalizeHours(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value < 1 || value > 20) {
    throw new RangeError("Weekly hours must be between 1 and 20.");
  }
  return value;
}

export function parseEvidence(input) {
  return String(input ?? "").split(/\r?\n/).map((line, i) => ({
    id: "evidence-" + (i + 1),
    claim: line.trim(),
    source: "User-entered line " + (i + 1) + " (unverified)"
  })).filter(item => item.claim).slice(0, 15);
}

export function buildPlan(routeId, weeklyHours) {
  if (!Object.hasOwn(ROUTES, routeId)) throw new RangeError("Unknown route.");
  const budgetMinutes = Math.floor(normalizeHours(weeklyHours) * 60);
  let used = 0;
  const actions = [];
  for (const [title, minutes] of TASKS[routeId]) {
    if (used + minutes > budgetMinutes) continue;
    const index = actions.length + 1;
    actions.push({ id: routeId + "-" + index, day: index, title, minutes });
    used += minutes;
  }
  return { routeId, weeklyHours: Number(weeklyHours), budgetMinutes, plannedMinutes: used, actions };
}

export function getProgress(plan, completedIds = []) {
  const completed = new Set(completedIds);
  const done = plan.actions.filter(action => completed.has(action.id));
  return {
    completedCount: done.length,
    totalCount: plan.actions.length,
    completedMinutes: done.reduce((sum, a) => sum + a.minutes, 0),
    plannedMinutes: plan.plannedMinutes
  };
}

function mdSafe(value) {
  return String(value ?? "").replace(/\r/g, "").replace(/\n/g, " ").trim();
}

export function exportMarkdown({ profile, evidence, plan, completedIds = [], reviewNotes = "" }) {
  if (!plan || !Object.hasOwn(ROUTES, plan.routeId)) throw new Error("Choose a route before exporting.");
  const status = new Set(completedIds);
  const lines = [
    "# ReboundOps — Seven-day recovery plan",
    "",
    "> Manual-pilot artifact; direction is a hypothesis, not employment advice or a verified job match.",
    "",
    "## Starting point",
    "- Recent role: " + mdSafe(profile.role),
    "- Location / work preference: " + mdSafe(profile.location),
    "- Weekly available time: " + plan.weeklyHours + " hours",
    "- Income urgency: " + mdSafe(profile.urgency),
    "- Priorities: " + mdSafe(profile.priorities),
    "",
    "## User-supplied evidence (unverified)"
  ];
  if (!evidence.length) lines.push("- No evidence supplied yet; verify claims before using them in applications.");
  else evidence.forEach(item => lines.push("- " + mdSafe(item.claim) + " — " + item.source));
  lines.push("", "## Chosen route", "**" + ROUTES[plan.routeId].label + "** — " + mdSafe(profile[plan.routeId === "return" ? "role" : plan.routeId === "shift" ? "shiftTarget" : "bridgeTarget"]), "", "Evidence to check: " + ROUTES[plan.routeId].test, "", "Uncertainty: " + ROUTES[plan.routeId].risk, "", "## Seven-day actions", "Planned: " + plan.plannedMinutes + " / " + plan.budgetMinutes + " minutes.");
  plan.actions.forEach(a => lines.push("- [" + (status.has(a.id) ? "x" : " ") + "] Day " + a.day + ": " + a.title + " (" + a.minutes + " min)"));
  lines.push("", "## Check-in", mdSafe(reviewNotes) || "No check-in notes yet.", "", "Generated locally. No automated data verification performed.");
  return lines.join("\n") + "\n";
}
